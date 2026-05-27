import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { stockLevelsService } from '../../services/stock/stock-levels.service'

export const stockLevelsRouter = router({
  list: protectedProcedure
    .input(z.object({ siteId: z.string().uuid() }))
    .query(({ ctx, input }) => stockLevelsService.list(ctx.user.id, input.siteId)),

  getByLocation: protectedProcedure
    .input(z.object({ locationId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      stockLevelsService.getByLocation(ctx.user.id, input.locationId)
    ),

  getByItem: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      stockLevelsService.getByItem(ctx.user.id, input.itemId)
    ),
})
