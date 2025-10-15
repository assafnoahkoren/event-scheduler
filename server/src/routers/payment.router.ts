import { router, protectedProcedure } from '../trpc'
import {
  paymentService,
  createPaymentSchema,
  updatePaymentSchema,
  getPaymentsSchema
} from '../services/payment.service'
import { z } from 'zod'

export const paymentRouter = router({
  create: protectedProcedure
    .input(createPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      return paymentService.createPayment(ctx.user.id, input)
    }),

  list: protectedProcedure
    .input(getPaymentsSchema)
    .query(async ({ ctx, input }) => {
      return paymentService.getPayments(ctx.user.id, input)
    }),

  update: protectedProcedure
    .input(updatePaymentSchema)
    .mutation(async ({ ctx, input }) => {
      return paymentService.updatePayment(ctx.user.id, input)
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return paymentService.deletePayment(ctx.user.id, input.id)
    }),

  summary: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return paymentService.calculateEventPaymentSummary(ctx.user.id, input.eventId)
    }),
})
