import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import {
  organizationService,
  createOrganizationSchema,
  updateOrganizationSchema,
  addMemberSchema,
  removeMemberSchema,
} from '../services/organization.service'

export const organizationRouter = router({
  // Create a new organization
  create: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await organizationService.createOrganization(ctx.user.id, input)
      } catch (error: any) {
        if (error.code === 'CONFLICT') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to create organization',
        })
      }
    }),

  // Get an organization by ID
  get: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        // Check if user has access
        const hasAccess = await organizationService.checkUserAccess(
          ctx.user.id,
          input.organizationId
        )

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this organization',
          })
        }

        return await organizationService.getOrganization(input.organizationId)
      } catch (error: any) {
        if (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN') {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get organization',
        })
      }
    }),

  // Get an organization by slug
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const org = await organizationService.getOrganizationBySlug(input.slug)

        // Check if user has access
        const hasAccess = await organizationService.checkUserAccess(
          ctx.user.id,
          org.id
        )

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this organization',
          })
        }

        return org
      } catch (error: any) {
        if (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN') {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get organization',
        })
      }
    }),

  // List user's organizations
  list: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        return await organizationService.listUserOrganizations(ctx.user.id)
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to list organizations',
        })
      }
    }),

  // Update an organization
  update: protectedProcedure
    .input(z.object({
      organizationId: z.string().uuid(),
      ...updateOrganizationSchema.shape,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { organizationId, ...updateData } = input

        // Check if user is the owner
        const org = await organizationService.getOrganization(organizationId)
        if (org.ownerId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only the organization owner can update settings',
          })
        }

        return await organizationService.updateOrganization(organizationId, updateData)
      } catch (error: any) {
        if (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to update organization',
        })
      }
    }),

  // Delete an organization
  delete: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user is the owner
        const org = await organizationService.getOrganization(input.organizationId)
        if (org.ownerId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only the organization owner can delete it',
          })
        }

        await organizationService.deleteOrganization(input.organizationId)
        return { success: true }
      } catch (error: any) {
        if (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to delete organization',
        })
      }
    }),

  // Add a member to the organization
  addMember: protectedProcedure
    .input(addMemberSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user is the owner or has permission
        const org = await organizationService.getOrganization(input.organizationId)
        if (org.ownerId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only the organization owner can add members',
          })
        }

        return await organizationService.addMember({
          ...input,
          invitedById: ctx.user.id,
        })
      } catch (error: any) {
        if (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN' || error.code === 'CONFLICT') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to add member',
        })
      }
    }),

  // Remove a member from the organization
  removeMember: protectedProcedure
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user is the owner
        const org = await organizationService.getOrganization(input.organizationId)
        if (org.ownerId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only the organization owner can remove members',
          })
        }

        await organizationService.removeMember(input)
        return { success: true }
      } catch (error: any) {
        if (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to remove member',
        })
      }
    }),

  // Get organization members
  getMembers: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        // Check if user has access
        const hasAccess = await organizationService.checkUserAccess(
          ctx.user.id,
          input.organizationId
        )

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this organization',
          })
        }

        return await organizationService.getOrganizationMembers(input.organizationId)
      } catch (error: any) {
        if (error.code === 'FORBIDDEN') {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get members',
        })
      }
    }),

  // Get or create default organization for user
  getOrCreateDefault: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        return await organizationService.getOrCreateDefaultOrganization(ctx.user.id)
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to get or create default organization',
        })
      }
    }),
})