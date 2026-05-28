import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import {
  stockItemCategoriesService,
  createStockItemCategorySchema,
  updateStockItemCategorySchema,
} from '../../services/stock/stock-item-categories.service'

export const stockItemCategoriesRouter = router({
  list: protectedProcedure
    .input(z.object({ siteId: z.string().uuid() }))
    .query(({ ctx, input }) => stockItemCategoriesService.list(ctx.user.id, input.siteId)),

  create: protectedProcedure
    .input(createStockItemCategorySchema)
    .mutation(({ ctx, input }) => stockItemCategoriesService.create(ctx.user.id, input)),

  update: protectedProcedure
    .input(updateStockItemCategorySchema)
    .mutation(({ ctx, input }) => stockItemCategoriesService.update(ctx.user.id, input)),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => stockItemCategoriesService.delete(ctx.user.id, input.id)),
})
