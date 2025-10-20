import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '../db'
import { createI18n, type SupportedLanguage } from '../i18n'

// Schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  defaultCurrency: z.string().default('USD'),
  timezone: z.string().default('UTC'),
  language: z.enum(['en', 'ar', 'he']).default('en'),
  dateFormat: z.string().default('dd/MM/yy'),
  plan: z.string().default('free'),
  maxSites: z.number().int().positive().default(3),
  maxUsers: z.number().int().positive().default(10),
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  defaultCurrency: z.string().optional(),
  timezone: z.string().optional(),
  language: z.enum(['en', 'ar', 'he']).optional(),
  dateFormat: z.string().optional(),
  plan: z.string().optional(),
  maxSites: z.number().int().positive().optional(),
  maxUsers: z.number().int().positive().optional(),
})

export const addMemberSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  invitedById: z.string().uuid().optional(),
})

export const removeMemberSchema = z.object({
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
})

// Types
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type AddMemberInput = z.infer<typeof addMemberSchema>
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>

class OrganizationService {
  private getServiceCategories(language: SupportedLanguage) {
    const i18n = createI18n(language)
    const categories = i18n.getSection('serviceCategories')

    // Define the order of categories
    const categoryKeys = [
      'photography', 'catering', 'music', 'decoration', 'venue',
      'flowers', 'transportation', 'coordination', 'security',
      'lighting', 'videography', 'makeup', 'rental', 'printing', 'other'
    ] as const

    return categoryKeys.map(key => ({
      name: categories[key].name,
      description: categories[key].description,
    }))
  }

  async createOrganization(userId: string, input: CreateOrganizationInput) {
    // Get language-specific categories
    const language = (input.language || 'en') as SupportedLanguage
    const serviceCategories = this.getServiceCategories(language)

    // Create organization with owner as first member and default categories
    const organization = await prisma.organization.create({
      data: {
        ...input,
        ownerId: userId,
        members: {
          create: {
            userId,
            isActive: true,
          },
        },
        serviceCategories: {
          create: serviceCategories,
        },
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
        sites: {
          where: { isDeleted: false },
        },
        _count: {
          select: {
            sites: true,
            members: true,
            clients: true,
            serviceProviders: true,
            serviceCategories: true,
          },
        },
      },
    })

    return organization
  }

  async getOrganization(organizationId: string) {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId, isDeleted: false },
      include: {
        owner: true,
        members: {
          where: { isDeleted: false },
          include: {
            user: true,
          },
        },
        sites: {
          where: { isDeleted: false },
        },
        _count: {
          select: {
            sites: true,
            members: true,
            clients: true,
            serviceProviders: true,
            serviceCategories: true,
          },
        },
      },
    })

    if (!organization) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found',
      })
    }

    return organization
  }


  async listUserOrganizations(userId: string) {
    const organizations = await prisma.organization.findMany({
      where: {
        isDeleted: false,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
                isActive: true,
                isDeleted: false,
              },
            },
          },
        ],
      },
      include: {
        owner: true,
        _count: {
          select: {
            sites: true,
            members: true,
          },
        },
      },
    })

    return organizations
  }

  async updateOrganization(organizationId: string, input: UpdateOrganizationInput) {
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: input,
      include: {
        owner: true,
        members: {
          where: { isDeleted: false },
          include: {
            user: true,
          },
        },
      },
    })

    return organization
  }

  async deleteOrganization(organizationId: string) {
    // This will soft delete due to the Prisma extension
    await prisma.organization.delete({
      where: { id: organizationId },
    })
  }

  async addMember(input: AddMemberInput) {
    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        isDeleted: false,
      },
    })

    if (existingMember) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User is already a member of this organization',
      })
    }

    const member = await prisma.organizationMember.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        invitedById: input.invitedById,
        invitedAt: input.invitedById ? new Date() : undefined,
      },
      include: {
        user: true,
        organization: true,
      },
    })

    return member
  }

  async removeMember(input: RemoveMemberInput) {
    const member = await prisma.organizationMember.findUnique({
      where: { id: input.memberId },
      include: {
        organization: true,
      },
    })

    if (!member) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Member not found',
      })
    }

    // Don't allow removing the owner
    if (member.organization.ownerId === member.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot remove the organization owner',
      })
    }

    // Soft delete the member
    await prisma.organizationMember.delete({
      where: { id: input.memberId },
    })
  }

  async getOrganizationMembers(organizationId: string) {
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId,
        isDeleted: false,
      },
      include: {
        user: true,
        invitedBy: true,
      },
    })

    return members
  }

  async checkUserAccess(userId: string, organizationId: string): Promise<boolean> {
    const organization = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        isDeleted: false,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
                isActive: true,
                isDeleted: false,
              },
            },
          },
        ],
      },
    })

    return !!organization
  }

  /**
   * Ensure a user is a member of an organization
   * Adds them if not already a member, or reactivates if inactive
   */
  async ensureOrganizationMembership(
    organizationId: string,
    userId: string,
    invitedById: string
  ) {
    // Check if user is part of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        isDeleted: false,
      },
    })

    // If user is not part of the organization, add them
    if (!orgMember) {
      await prisma.organizationMember.create({
        data: {
          organizationId,
          userId,
          invitedById,
          invitedAt: new Date(),
          isActive: true,
        },
      })
    } else if (!orgMember.isActive) {
      // Reactivate if inactive
      await prisma.organizationMember.update({
        where: { id: orgMember.id },
        data: {
          isActive: true,
          invitedById,
          invitedAt: new Date(),
        },
      })
    }
  }

  async getOrCreateDefaultOrganization(userId: string) {
    // Check if user already has an organization
    const existingOrg = await prisma.organization.findFirst({
      where: {
        ownerId: userId,
        isDeleted: false,
      },
    })

    if (existingOrg) {
      return existingOrg
    }

    // Get user details for organization name
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      })
    }

    // Get user's preferred language
    const userLanguage = (user.language || 'en') as SupportedLanguage
    const i18n = createI18n(userLanguage)

    // Create localized organization name
    const orgName = user.firstName && user.lastName
      ? i18n.t('organization.defaultName').replace('{{userName}}', `${user.firstName} ${user.lastName}`)
      : i18n.t('organization.defaultNameFromEmail').replace('{{emailPrefix}}', user.email.split('@')[0])

    return await this.createOrganization(userId, {
      name: orgName,
      defaultCurrency: 'USD',
      timezone: 'UTC',
      language: userLanguage,
      dateFormat: 'dd/MM/yy',
      plan: 'free',
      maxSites: 3,
      maxUsers: 10,
    })
  }
}

export const organizationService = new OrganizationService()