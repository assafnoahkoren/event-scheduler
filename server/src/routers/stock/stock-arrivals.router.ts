import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import {
  stockArrivalsService,
  createStockArrivalSchema,
} from '../../services/stock/stock-arrivals.service'

export const stockArrivalsRouter = router({
  create: protectedProcedure
    .input(createStockArrivalSchema)
    .mutation(({ ctx, input }) => stockArrivalsService.create(ctx.user.id, input)),

  list: protectedProcedure
    .input(z.object({ purchaseOrderLineId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      stockArrivalsService.list(ctx.user.id, input.purchaseOrderLineId)
    ),
})
