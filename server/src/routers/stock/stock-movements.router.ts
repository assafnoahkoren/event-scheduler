import { router, protectedProcedure } from '../../trpc'
import {
  stockMovementsService,
  createStockMovementSchema,
  listStockMovementsSchema,
} from '../../services/stock/stock-movements.service'

export const stockMovementsRouter = router({
  create: protectedProcedure
    .input(createStockMovementSchema)
    .mutation(({ ctx, input }) => stockMovementsService.create(ctx.user.id, input)),

  list: protectedProcedure
    .input(listStockMovementsSchema)
    .query(({ ctx, input }) => stockMovementsService.list(ctx.user.id, input)),
})
