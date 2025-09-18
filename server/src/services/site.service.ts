/**
 * Site service for managing multi-tenant sites
 */

import { PrismaClient, SiteRole } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Schema definitions
export const createSiteSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
  timezone: z.string().default('UTC'),
})

export const updateSiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  timezone: z.string().optional(),
  logo: z.url().optional(),
})

// Type inference from schemas
export type CreateSiteInput = z.infer<typeof createSiteSchema>
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>

class SiteService {
  /**
   * Create a new site
   */
  async createSite(userId: string, input: CreateSiteInput) {
    // Check if slug is already taken
    const existingSite = await prisma.site.findUnique({
      where: { slug: input.slug },
    })

    if (existingSite) {
      throw new Error('A site with this slug already exists')
    }

    // Create site with owner
    const site = await prisma.site.create({
      data: {
        ...input,
        ownerId: userId,
        siteUsers: {
          create: {
            userId,
            role: SiteRole.OWNER,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        siteUsers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
    })

    return site
  }

  /**
   * Get all sites for a user
   */
  async getUserSites(userId: string) {
    const sites = await prisma.site.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            siteUsers: {
              some: {
                userId,
                isActive: true,
              },
            },
          },
        ],
        isActive: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        siteUsers: {
          where: { userId },
          select: {
            role: true,
            joinedAt: true,
          },
        },
        _count: {
          select: {
            siteUsers: true,
            events: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return sites.map(site => ({
      ...site,
      userRole: site.siteUsers[0]?.role || (site.ownerId === userId ? SiteRole.OWNER : null),
    }))
  }

  /**
   * Get a specific site
   */
  async getSite(siteId: string, userId: string) {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        siteUsers: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        invitations: {
          where: { status: 'PENDING' },
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            events: true,
          },
        },
      },
    })

    if (!site) {
      throw new Error('Site not found')
    }

    // Check if user has access
    const userAccess = await this.getUserSiteRole(userId, siteId)
    if (!userAccess) {
      throw new Error('You do not have access to this site')
    }

    return {
      ...site,
      userRole: userAccess,
    }
  }

  /**
   * Update site details
   */
  async updateSite(siteId: string, userId: string, input: UpdateSiteInput) {
    // Check if user has admin access
    const userRole = await this.getUserSiteRole(userId, siteId)
    if (!userRole || (userRole !== SiteRole.OWNER && userRole !== SiteRole.ADMIN)) {
      throw new Error('You do not have permission to update this site')
    }

    const site = await prisma.site.update({
      where: { id: siteId },
      data: input,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    })

    return site
  }

  /**
   * Delete a site (owner only)
   */
  async deleteSite(siteId: string, userId: string) {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
    })

    if (!site) {
      throw new Error('Site not found')
    }

    if (site.ownerId !== userId) {
      throw new Error('Only the site owner can delete a site')
    }

    await prisma.site.delete({
      where: { id: siteId },
    })

    return { success: true }
  }

  /**
   * Get user's role in a site
   */
  async getUserSiteRole(userId: string, siteId: string): Promise<SiteRole | null> {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        ownerId: true,
        siteUsers: {
          where: { userId, isActive: true },
          select: { role: true },
        },
      },
    })

    if (!site) return null

    if (site.ownerId === userId) return SiteRole.OWNER

    return site.siteUsers[0]?.role || null
  }

  /**
   * Check if user has access to a site
   */
  async checkUserAccess(
    userId: string,
    siteId: string,
    requiredRole?: SiteRole
  ): Promise<boolean> {
    const userRole = await this.getUserSiteRole(userId, siteId)

    if (!userRole) return false

    if (!requiredRole) return true

    const roleHierarchy = {
      [SiteRole.OWNER]: 4,
      [SiteRole.ADMIN]: 3,
      [SiteRole.EDITOR]: 2,
      [SiteRole.VIEWER]: 1,
    }

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  }

  /**
   * Add a user to a site directly (without invitation)
   */
  async addUserToSite(
    siteId: string,
    userId: string,
    targetUserId: string,
    role: SiteRole
  ) {
    // Check if requester has admin access
    const userRole = await this.getUserSiteRole(userId, siteId)
    if (!userRole || (userRole !== SiteRole.OWNER && userRole !== SiteRole.ADMIN)) {
      throw new Error('You do not have permission to add users to this site')
    }

    // Check if target user already has access
    const existingAccess = await prisma.siteUser.findUnique({
      where: {
        userId_siteId: {
          userId: targetUserId,
          siteId,
        },
      },
    })

    if (existingAccess) {
      if (existingAccess.isActive) {
        throw new Error('User already has access to this site')
      } else {
        // Reactivate inactive user
        return await prisma.siteUser.update({
          where: { id: existingAccess.id },
          data: {
            isActive: true,
            role,
            joinedAt: new Date(),
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
        })
      }
    }

    // Add user to site
    const siteUser = await prisma.siteUser.create({
      data: {
        userId: targetUserId,
        siteId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    })

    return siteUser
  }

  /**
   * Remove a user from a site
   */
  async removeUserFromSite(
    siteId: string,
    userId: string,
    targetUserId: string
  ) {
    // Users can remove themselves, or admins can remove others
    if (userId !== targetUserId) {
      const userRole = await this.getUserSiteRole(userId, siteId)
      if (!userRole || (userRole !== SiteRole.OWNER && userRole !== SiteRole.ADMIN)) {
        throw new Error('You do not have permission to remove users from this site')
      }
    }

    // Cannot remove the owner
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { ownerId: true },
    })

    if (site?.ownerId === targetUserId) {
      throw new Error('Cannot remove the site owner')
    }

    await prisma.siteUser.updateMany({
      where: {
        userId: targetUserId,
        siteId,
      },
      data: {
        isActive: false,
      },
    })

    return { success: true }
  }

  /**
   * Update a user's role in a site
   */
  async updateUserRole(
    siteId: string,
    userId: string,
    targetUserId: string,
    newRole: SiteRole
  ) {
    // Check if requester has owner access (only owners can change roles)
    const userRole = await this.getUserSiteRole(userId, siteId)
    if (userRole !== SiteRole.OWNER) {
      throw new Error('Only the site owner can change user roles')
    }

    // Cannot change owner's role
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { ownerId: true },
    })

    if (site?.ownerId === targetUserId) {
      throw new Error('Cannot change the site owner\'s role')
    }

    const siteUser = await prisma.siteUser.update({
      where: {
        userId_siteId: {
          userId: targetUserId,
          siteId,
        },
      },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    })

    return siteUser
  }
}

export const siteService = new SiteService()