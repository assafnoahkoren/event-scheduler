import { router, protectedProcedure } from '../trpc'
import {
  clientService,
  searchClientsSchema,
  createClientSchema,
  updateClientSchema
} from '../services/client.service'
import { z } from 'zod'

export const clientRouter = router({
  search: protectedProcedure
    .input(searchClientsSchema)
    .query(async ({ ctx, input }) => {
      return clientService.searchClients(ctx.user.id, input)
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return clientService.getClient(ctx.user.id, input.id)
    }),

  create: protectedProcedure
    .input(createClientSchema)
    .mutation(async ({ ctx, input }) => {
      return clientService.createClient(ctx.user.id, input)
    }),

  update: protectedProcedure
    .input(updateClientSchema)
    .mutation(async ({ ctx, input }) => {
      return clientService.updateClient(ctx.user.id, input)
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return clientService.deleteClient(ctx.user.id, input.id)
    })
})