/**
 * Invitation service for managing site invitations
 */

import { SiteRole, InvitationStatus } from '@prisma/client'
import { siteService } from './site.service'
import { z } from 'zod'
import { prisma } from '../db'

// Schema definitions
export const createInvitationSchema = z.object({
  siteId: z.string(),
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'] as const).transform(val => val as SiteRole),
  message: z.string().max(500).optional(),
})

// Type inference from schema
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>

class InvitationService {
  /**
   * Create an invitation to a site
   */
  async createInvitation(userId: string, input: CreateInvitationInput) {
    // Check if user has admin access to the site
    const userRole = await siteService.getUserSiteRole(userId, input.siteId)
    if (!userRole || (userRole !== SiteRole.OWNER && userRole !== SiteRole.ADMIN)) {
      throw new Error('You do not have permission to invite users to this site')
    }

    // Check if user is already a member
    const existingMember = await prisma.siteUser.findFirst({
      where: {
        siteId: input.siteId,
        user: { email: input.email },
        isActive: true,
      },
    })

    if (existingMember) {
      throw new Error('This user is already a member of the site')
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.siteInvitation.findFirst({
      where: {
        siteId: input.siteId,
        email: input.email,
        status: InvitationStatus.PENDING,
      },
    })

    if (existingInvitation) {
      throw new Error('An invitation has already been sent to this email')
    }

    // Create invitation with 7-day expiry
    const invitation = await prisma.siteInvitation.create({
      data: {
        siteId: input.siteId,
        email: input.email,
        role: input.role,
        message: input.message,
        invitedBy: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
          },
        },
        inviter: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    // TODO: Send invitation email
    // await emailService.sendInvitationEmail(invitation)

    return invitation
  }

  /**
   * Get all pending invitations for a site
   */
  async getSiteInvitations(siteId: string, userId: string) {
    // Check if user has access to view invitations
    const userRole = await siteService.getUserSiteRole(userId, siteId)
    if (!userRole) {
      throw new Error('You do not have access to this site')
    }

    const invitations = await prisma.siteInvitation.findMany({
      where: {
        siteId,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: {
        inviter: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return invitations
  }

  /**
   * Get invitations for an email address
   */
  async getUserInvitations(email: string) {
    const invitations = await prisma.siteInvitation.findMany({
      where: {
        email,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
          },
        },
        inviter: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return invitations
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string, userId: string) {
    const invitation = await prisma.siteInvitation.findUnique({
      where: { token },
      include: {
        site: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!invitation) {
      throw new Error('Invalid invitation token')
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('This invitation has already been used')
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.siteInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      })
      throw new Error('This invitation has expired')
    }

    // Check if the user's email matches the invitation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    if (user?.email !== invitation.email) {
      throw new Error('This invitation was sent to a different email address')
    }

    // Accept invitation and add user to site in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update invitation status
      const updatedInvitation = await tx.siteInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedBy: userId,
          acceptedAt: new Date(),
        },
      })

      // Add user to site
      const siteUser = await tx.siteUser.create({
        data: {
          userId,
          siteId: invitation.siteId,
          role: invitation.role,
        },
      })

      return { invitation: updatedInvitation, siteUser }
    })

    return {
      ...result,
      site: invitation.site,
    }
  }

  /**
   * Decline an invitation
   */
  async declineInvitation(token: string, userId: string) {
    const invitation = await prisma.siteInvitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      throw new Error('Invalid invitation token')
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('This invitation has already been processed')
    }

    // Check if the user's email matches the invitation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    if (user?.email !== invitation.email) {
      throw new Error('This invitation was sent to a different email address')
    }

    await prisma.siteInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.DECLINED,
      },
    })

    return { success: true }
  }

  /**
   * Cancel an invitation (by inviter or admin)
   */
  async cancelInvitation(invitationId: string, userId: string) {
    const invitation = await prisma.siteInvitation.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        siteId: true,
        invitedBy: true,
        status: true,
      },
    })

    if (!invitation) {
      throw new Error('Invitation not found')
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('Can only cancel pending invitations')
    }

    // Check permissions - can be cancelled by inviter or site admin
    if (invitation.invitedBy !== userId) {
      const userRole = await siteService.getUserSiteRole(userId, invitation.siteId)
      if (!userRole || (userRole !== SiteRole.OWNER && userRole !== SiteRole.ADMIN)) {
        throw new Error('You do not have permission to cancel this invitation')
      }
    }

    await prisma.siteInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.CANCELLED,
      },
    })

    return { success: true }
  }

  /**
   * Resend an invitation
   */
  async resendInvitation(invitationId: string, userId: string) {
    const invitation = await prisma.siteInvitation.findUnique({
      where: { id: invitationId },
      include: {
        site: {
          select: {
            id: true,
            name: true,
          },
        },
        inviter: {
          select: {
            email: true,
          },
        },
      },
    })

    if (!invitation) {
      throw new Error('Invitation not found')
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('Can only resend pending invitations')
    }

    // Check permissions
    if (invitation.invitedBy !== userId) {
      const userRole = await siteService.getUserSiteRole(userId, invitation.siteId)
      if (!userRole || (userRole !== SiteRole.OWNER && userRole !== SiteRole.ADMIN)) {
        throw new Error('You do not have permission to resend this invitation')
      }
    }

    // Update expiry date
    const updatedInvitation = await prisma.siteInvitation.update({
      where: { id: invitationId },
      data: {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        token: undefined, // Generate new token
      },
    })

    // TODO: Resend invitation email
    // await emailService.sendInvitationEmail(updatedInvitation)

    return updatedInvitation
  }
}

export const invitationService = new InvitationService()