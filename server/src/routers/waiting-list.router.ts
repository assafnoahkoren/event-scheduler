import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '../db'
import { TRPCError } from '@trpc/server'
import {
  createWaitingListEntry,
  updateWaitingListEntry,
  listWaitingListEntries,
  getWaitingListEntry,
  deleteWaitingListEntry,
  checkForMatches,
  expireOldEntries,
  checkAllEntriesForMatches,
  createWaitingListEntrySchema,
  updateWaitingListEntrySchema,
  listWaitingListEntriesSchema
} from '../services/waiting-list/waiting-list.service'
import { siteService } from '../services/site.service'
import { SiteRole } from '@prisma/client'

export const waitingListRouter = router({
  create: protectedProcedure
    .input(createWaitingListEntrySchema.omit({ createdBy: true }))
    .mutation(async ({ input, ctx }) => {
      // Check if user has access to the site
      const hasAccess = await siteService.checkUserAccess(
        ctx.user.id,
        input.siteId,
        SiteRole.EDITOR // Need at least editor role to create entries
      )

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create waiting list entries for this site'
        })
      }

      return createWaitingListEntry({
        ...input,
        createdBy: ctx.user.id
      })
    }),

  update: protectedProcedure
    .input(updateWaitingListEntrySchema)
    .mutation(async ({ input, ctx }) => {
      // Get the entry to check site access
      const entry = await getWaitingListEntry(input.id)

      // Check if user has access to the site
      const hasAccess = await siteService.checkUserAccess(
        ctx.user.id,
        entry.siteId,
        SiteRole.EDITOR
      )

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this waiting list entry'
        })
      }

      return updateWaitingListEntry(input)
    }),

  list: protectedProcedure
    .input(listWaitingListEntriesSchema)
    .query(async ({ input, ctx }) => {
      // Check if user has access to the site
      const hasAccess = await siteService.checkUserAccess(
        ctx.user.id,
        input.siteId,
        SiteRole.VIEWER // Viewers can see waiting list
      )

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view waiting list entries for this site'
        })
      }

      return listWaitingListEntries(input)
    }),

  get: protectedProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .query(async ({ input, ctx }) => {
      const entry = await getWaitingListEntry(input.id)

      // Check if user has access to the site
      const hasAccess = await siteService.checkUserAccess(
        ctx.user.id,
        entry.siteId,
        SiteRole.VIEWER
      )

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this waiting list entry'
        })
      }

      return entry
    }),

  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .mutation(async ({ input, ctx }) => {
      // Get the entry to check site access
      const entry = await getWaitingListEntry(input.id)

      // Check if user has access to the site
      const hasAccess = await siteService.checkUserAccess(
        ctx.user.id,
        entry.siteId,
        SiteRole.ADMIN // Need admin role to delete
      )

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this waiting list entry'
        })
      }

      return deleteWaitingListEntry(input.id)
    }),

  // Check for matches for a specific date
  checkMatches: protectedProcedure
    .input(z.object({
      siteId: z.string().uuid(),
      date: z.string().datetime()
    }))
    .query(async ({ input, ctx }) => {
      // Check if user has access to the site
      const hasAccess = await siteService.checkUserAccess(
        ctx.user.id,
        input.siteId,
        SiteRole.VIEWER
      )

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to check matches for this site'
        })
      }

      return checkForMatches(input.siteId, new Date(input.date))
    }),

  // Expire old entries for a site
  expireOld: protectedProcedure
    .input(z.object({
      siteId: z.string().uuid()
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user has access to the site
      const hasAccess = await siteService.checkUserAccess(
        ctx.user.id,
        input.siteId,
        SiteRole.EDITOR
      )

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to expire entries for this site'
        })
      }

      const result = await expireOldEntries(input.siteId)
      return {
        expired: result.count
      }
    }),

  // Get waiting list entries for the current user's sites (for homepage)
  getForCurrentUser: protectedProcedure
    .input(z.object({
      siteId: z.string().uuid().optional()
    }))
    .query(async ({ input, ctx }) => {
      // If siteId is provided, check access
      if (input.siteId) {
        const hasAccess = await siteService.checkUserAccess(
          ctx.user.id,
          input.siteId,
          SiteRole.VIEWER
        )

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view waiting list entries for this site'
          })
        }

        // First expire old entries
        await expireOldEntries(input.siteId)

        return listWaitingListEntries({
          siteId: input.siteId,
          includeExpired: false
        })
      }

      // Otherwise, get all sites the user has access to
      const userSites = await prisma.siteUser.findMany({
        where: {
          userId: ctx.user.id
        },
        select: {
          siteId: true
        }
      })

      if (userSites.length === 0) {
        return []
      }

      // Get waiting list entries for all user's sites
      const allEntries = await Promise.all(
        userSites.map(async ({ siteId }) => {
          // Expire old entries for each site
          await expireOldEntries(siteId)

          return listWaitingListEntries({
            siteId,
            includeExpired: false
          })
        })
      )

      // Flatten and sort by creation date
      return allEntries
        .flat()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }),

  // Check all entries for a site and find available matches
  checkAllMatches: protectedProcedure
    .input(z.object({
      siteId: z.string().uuid(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional()
    }))
    .query(async ({ input, ctx }) => {
      // Check if user has access to the site
      const hasAccess = await siteService.checkUserAccess(
        ctx.user.id,
        input.siteId,
        SiteRole.VIEWER // Viewers can check matches
      )

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to check waiting list matches for this site'
        })
      }

      const startDate = input.startDate ? new Date(input.startDate) : undefined
      const endDate = input.endDate ? new Date(input.endDate) : undefined

      return checkAllEntriesForMatches(input.siteId, startDate, endDate)
    })
})