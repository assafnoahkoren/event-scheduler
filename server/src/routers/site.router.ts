/**
 * Site management router for tRPC
 */

import { router, protectedProcedure } from '../trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { siteService, createSiteSchema, updateSiteSchema, addMemberByEmailSchema } from '../services/site.service'
import { invitationService, createInvitationSchema } from '../services/invitation.service'
import { SiteRole } from '@prisma/client'

// Router-specific schemas (not shared with services)
const siteIdSchema = z.object({ siteId: z.uuid() })

const updateSiteWithIdSchema = updateSiteSchema.extend({
  siteId: z.uuid(),
})

const updateUserRoleSchema = z.object({
  siteId: z.uuid(),
  userId: z.uuid(),
  role: z.enum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'] as const).transform(val => val as SiteRole),
})

const removeUserSchema = z.object({
  siteId: z.uuid(),
  userId: z.uuid(),
})

export const siteRouter = router({
  /**
   * Create a new site
   */
  create: protectedProcedure
    .input(createSiteSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const site = await siteService.createSite(ctx.user.id, input)
        return site
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to create site',
        })
      }
    }),

  /**
   * Get all sites for the current user
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const sites = await siteService.getUserSites(ctx.user.id)
        return sites
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch sites',
        })
      }
    }),

  /**
   * Get a specific site
   */
  get: protectedProcedure
    .input(siteIdSchema)
    .query(async ({ input, ctx }) => {
      try {
        const site = await siteService.getSite(input.siteId, ctx.user.id)
        return site
      } catch (error: any) {
        throw new TRPCError({
          code: error.message.includes('not found') ? 'NOT_FOUND' : 'FORBIDDEN',
          message: error.message || 'Failed to fetch site',
        })
      }
    }),

  /**
   * Update site details
   */
  update: protectedProcedure
    .input(updateSiteWithIdSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { siteId, ...updateData } = input
        const site = await siteService.updateSite(siteId, ctx.user.id, updateData)
        return site
      } catch (error: any) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error.message || 'Failed to update site',
        })
      }
    }),

  /**
   * Delete a site
   */
  delete: protectedProcedure
    .input(siteIdSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        await siteService.deleteSite(input.siteId, ctx.user.id)
        return { success: true }
      } catch (error: any) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error.message || 'Failed to delete site',
        })
      }
    }),

  /**
   * Add a member to a site by email (direct add, no invitation)
   */
  addMemberByEmail: protectedProcedure
    .input(addMemberByEmailSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await siteService.addUserByEmail(
          input.siteId,
          ctx.user.id,
          input.email
        )
        return result
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to add member',
        })
      }
    }),

  /**
   * Invite a user to a site
   */
  inviteUser: protectedProcedure
    .input(createInvitationSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const invitation = await invitationService.createInvitation(ctx.user.id, input)
        return invitation
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to send invitation',
        })
      }
    }),

  /**
   * Get site invitations
   */
  getInvitations: protectedProcedure
    .input(siteIdSchema)
    .query(async ({ input, ctx }) => {
      try {
        const invitations = await invitationService.getSiteInvitations(
          input.siteId,
          ctx.user.id
        )
        return invitations
      } catch (error: any) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error.message || 'Failed to fetch invitations',
        })
      }
    }),

  /**
   * Get current user's pending invitations
   */
  myInvitations: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const invitations = await invitationService.getUserInvitations(ctx.user.email)
        return invitations
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch invitations',
        })
      }
    }),

  /**
   * Accept an invitation
   */
  acceptInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await invitationService.acceptInvitation(
          input.token,
          ctx.user.id
        )
        return result
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to accept invitation',
        })
      }
    }),

  /**
   * Decline an invitation
   */
  declineInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await invitationService.declineInvitation(input.token, ctx.user.id)
        return { success: true }
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to decline invitation',
        })
      }
    }),

  /**
   * Cancel an invitation
   */
  cancelInvitation: protectedProcedure
    .input(z.object({ invitationId: z.uuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await invitationService.cancelInvitation(input.invitationId, ctx.user.id)
        return { success: true }
      } catch (error: any) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error.message || 'Failed to cancel invitation',
        })
      }
    }),

  /**
   * Remove a user from a site
   */
  removeUser: protectedProcedure
    .input(removeUserSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        await siteService.removeUserFromSite(
          input.siteId,
          ctx.user.id,
          input.userId
        )
        return { success: true }
      } catch (error: any) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error.message || 'Failed to remove user',
        })
      }
    }),

  /**
   * Update a user's role in a site
   */
  updateUserRole: protectedProcedure
    .input(updateUserRoleSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await siteService.updateUserRole(
          input.siteId,
          ctx.user.id,
          input.userId,
          input.role
        )
        return result
      } catch (error: any) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error.message || 'Failed to update user role',
        })
      }
    }),

  /**
   * Leave a site
   */
  leave: protectedProcedure
    .input(siteIdSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        await siteService.removeUserFromSite(
          input.siteId,
          ctx.user.id,
          ctx.user.id
        )
        return { success: true }
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to leave site',
        })
      }
    }),
})