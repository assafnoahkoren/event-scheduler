import { router, protectedProcedure } from '../trpc'
import {
  userActivityService,
  getObjectActivitySchema,
  getUserActivitySchema,
  getEventActivitySchema,
  getOrganizationActivitySchema,
} from '../services/user-activity.service'
import { z } from 'zod'

export const userActivityRouter = router({
  // Get activities for a specific object (polymorphic)
  getObjectActivity: protectedProcedure
    .input(getObjectActivitySchema)
    .query(async ({ ctx, input }) => {
      return userActivityService.getObjectActivity(ctx.user.id, input)
    }),

  // Get activities by user
  getUserActivity: protectedProcedure
    .input(getUserActivitySchema)
    .query(async ({ ctx, input }) => {
      return userActivityService.getUserActivity(ctx.user.id, input)
    }),

  // Get activities for an event
  getEventActivity: protectedProcedure
    .input(getEventActivitySchema)
    .query(async ({ ctx, input }) => {
      return userActivityService.getEventActivity(ctx.user.id, input)
    }),

  // Get activities for an organization
  getOrganizationActivity: protectedProcedure
    .input(getOrganizationActivitySchema)
    .query(async ({ ctx, input }) => {
      return userActivityService.getOrganizationActivity(ctx.user.id, input)
    }),

  // Mark activity as viewed
  markViewed: protectedProcedure
    .input(z.object({ activityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return userActivityService.markActivityViewed(ctx.user.id, input.activityId)
    }),
})
