import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import {
  purchaseOrdersService,
  createPurchaseOrderSchema,
} from '../../services/stock/purchase-orders.service'

export const purchaseOrdersRouter = router({
  list: protectedProcedure
    .input(z.object({
      siteId: z.string().uuid(),
      status: z.enum(['OPEN', 'PARTIAL', 'COMPLETE', 'CANCELLED'] as const).optional(),
    }))
    .query(({ ctx, input }) =>
      purchaseOrdersService.list(ctx.user.id, input.siteId, input.status)
    ),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => purchaseOrdersService.get(ctx.user.id, input.id)),

  create: protectedProcedure
    .input(createPurchaseOrderSchema)
    .mutation(({ ctx, input }) => purchaseOrdersService.create(ctx.user.id, input)),

  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => purchaseOrdersService.cancel(ctx.user.id, input.id)),
})
