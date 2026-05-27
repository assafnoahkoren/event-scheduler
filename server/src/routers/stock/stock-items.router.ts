import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import {
  stockItemsService,
  createStockItemSchema,
  updateStockItemSchema,
} from '../../services/stock/stock-items.service'

export const stockItemsRouter = router({
  list: protectedProcedure
    .input(z.object({ siteId: z.string().uuid() }))
    .query(({ ctx, input }) => stockItemsService.list(ctx.user.id, input.siteId)),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => stockItemsService.get(ctx.user.id, input.id)),

  create: protectedProcedure
    .input(createStockItemSchema)
    .mutation(({ ctx, input }) => stockItemsService.create(ctx.user.id, input)),

  update: protectedProcedure
    .input(updateStockItemSchema)
    .mutation(({ ctx, input }) => stockItemsService.update(ctx.user.id, input)),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => stockItemsService.delete(ctx.user.id, input.id)),
})
