import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import {
  taskService,
  createTaskSchema,
  updateTaskSchema,
} from '../services/task.service'

export const taskRouter = router({
  create: protectedProcedure
    .input(createTaskSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await taskService.createTask(ctx.user.id, input)
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to create task',
        })
      }
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      try {
        return await taskService.getTask(ctx.user.id, input.id)
      } catch (error: any) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: error.message || 'Task not found',
        })
      }
    }),

  listForEvent: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      try {
        return await taskService.listTasksForEvent(ctx.user.id, input.eventId)
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to list tasks',
        })
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }).merge(updateTaskSchema)
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input
      try {
        return await taskService.updateTask(ctx.user.id, id, data)
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to update task',
        })
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await taskService.deleteTask(ctx.user.id, input.id)
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to delete task',
        })
      }
    }),
})
