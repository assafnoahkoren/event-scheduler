import { router, protectedProcedure } from '../trpc'
import {
  eventService,
  createEventSchema,
  updateEventSchema,
  getEventsSchema,
  searchEventsSchema
} from '../services/event.service'
import { z } from 'zod'

export const eventRouter = router({
  create: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      return eventService.createEvent(ctx.user.id, input)
    }),

  list: protectedProcedure
    .input(getEventsSchema)
    .query(async ({ ctx, input }) => {
      return eventService.getEvents(ctx.user.id, input)
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return eventService.getEvent(ctx.user.id, input.id)
    }),

  update: protectedProcedure
    .input(updateEventSchema)
    .mutation(async ({ ctx, input }) => {
      return eventService.updateEvent(ctx.user.id, input)
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return eventService.deleteEvent(ctx.user.id, input.id)
    }),

  calculateCosts: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return eventService.calculateEventCosts(ctx.user.id, input.eventId)
    }),

  profitByDateRange: protectedProcedure
    .input(z.object({
      siteId: z.string().uuid(),
      startDate: z.string(),
      endDate: z.string()
    }))
    .query(async ({ ctx, input }) => {
      return eventService.calculateProfitByDateRange(
        ctx.user.id,
        input.siteId,
        input.startDate,
        input.endDate
      )
    }),

  search: protectedProcedure
    .input(searchEventsSchema)
    .query(async ({ ctx, input }) => {
      return eventService.searchEvents(ctx.user.id, input)
    }),

  getCateringOptions: protectedProcedure
    .input(z.object({ siteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return eventService.getCateringOptions(ctx.user.id, input.siteId)
    }),
})