import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import {
  stockRecountsService,
  createStockRecountSchema,
} from '../../services/stock/stock-recounts.service'

export const stockRecountsRouter = router({
  create: protectedProcedure
    .input(createStockRecountSchema)
    .mutation(({ ctx, input }) => stockRecountsService.create(ctx.user.id, input)),

  list: protectedProcedure
    .input(z.object({
      siteId: z.string().uuid(),
      locationId: z.string().uuid().optional(),
      itemId: z.string().uuid().optional(),
    }))
    .query(({ ctx, input }) => stockRecountsService.list(ctx.user.id, input)),
})
