import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import {
  eventProviderService,
  addEventProviderSchema,
  updateEventProviderSchema,
} from '../services/event-provider.service'

export const eventProviderRouter = router({
  // List providers for an event
  listByEvent: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      try {
        return await eventProviderService.listEventProviders(input.eventId)
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch event providers',
        })
      }
    }),

  // Add provider to event
  add: protectedProcedure
    .input(addEventProviderSchema)
    .mutation(async ({ input }) => {
      try {
        return await eventProviderService.addEventProvider(input)
      } catch (error: any) {
        if (error.code === 'NOT_FOUND' || error.code === 'CONFLICT') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to add provider to event',
        })
      }
    }),

  // Update event provider
  update: protectedProcedure
    .input(z.object({
      eventProviderId: z.string().uuid(),
      ...updateEventProviderSchema.shape,
    }))
    .mutation(async ({ input }) => {
      try {
        const { eventProviderId, ...data } = input
        return await eventProviderService.updateEventProvider(eventProviderId, data)
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to update event provider',
        })
      }
    }),

  // Remove provider from event
  remove: protectedProcedure
    .input(z.object({
      eventProviderId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      try {
        await eventProviderService.removeEventProvider(input.eventProviderId)
        return { success: true }
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to remove provider from event',
        })
      }
    }),

  // Get provider availability
  getAvailability: protectedProcedure
    .input(z.object({
      providerId: z.string().uuid(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    }))
    .query(async ({ input }) => {
      try {
        return await eventProviderService.getProviderAvailability(
          input.providerId,
          input.startDate,
          input.endDate
        )
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch provider availability',
        })
      }
    }),

  // Get payment summary for event providers
  getPaymentSummary: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      try {
        return await eventProviderService.getEventProviderPaymentSummary(input.eventId)
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch payment summary',
        })
      }
    }),
})