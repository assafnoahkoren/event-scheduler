import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import {
  stockLocationsService,
  createStockLocationSchema,
  updateStockLocationSchema,
} from '../../services/stock/stock-locations.service'

export const stockLocationsRouter = router({
  list: protectedProcedure
    .input(z.object({ siteId: z.string().uuid() }))
    .query(({ ctx, input }) => stockLocationsService.list(ctx.user.id, input.siteId)),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => stockLocationsService.get(ctx.user.id, input.id)),

  create: protectedProcedure
    .input(createStockLocationSchema)
    .mutation(({ ctx, input }) => stockLocationsService.create(ctx.user.id, input)),

  update: protectedProcedure
    .input(updateStockLocationSchema)
    .mutation(({ ctx, input }) => stockLocationsService.update(ctx.user.id, input)),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => stockLocationsService.delete(ctx.user.id, input.id)),
})
