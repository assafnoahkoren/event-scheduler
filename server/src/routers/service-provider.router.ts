import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import {
  serviceProviderService,
  createServiceProviderSchema,
  updateServiceProviderSchema,
  serviceProviderIdSchema,
  createServiceProviderServiceSchema,
  updateServiceProviderServiceSchema,
  createServiceCategorySchema,
  updateServiceCategorySchema,
  serviceCategoryIdSchema,
  updateCategoryOrderSchema,
} from '../services/service-provider.service'

export const serviceProviderRouter = router({
  // List all serviceProviders
  list: protectedProcedure
    .input(z.object({
      organizationId: z.string().uuid(),
      search: z.string().optional(),
      includeDeleted: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      try {
        return await serviceProviderService.listServiceProviders(
          input.organizationId,
          input.search,
          input.includeDeleted
        )
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch serviceProviders',
        })
      }
    }),

  // Get a specific serviceProvider
  get: protectedProcedure
    .input(serviceProviderIdSchema)
    .query(async ({ input }) => {
      try {
        return await serviceProviderService.getServiceProvider(input.serviceProviderId)
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch serviceProvider',
        })
      }
    }),

  // Create a new serviceProvider
  create: protectedProcedure
    .input(createServiceProviderSchema)
    .mutation(async ({ input }) => {
      try {
        return await serviceProviderService.createServiceProvider(input)
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to create serviceProvider',
        })
      }
    }),

  // Update a serviceProvider
  update: protectedProcedure
    .input(serviceProviderIdSchema.merge(updateServiceProviderSchema))
    .mutation(async ({ input }) => {
      try {
        const { serviceProviderId, ...data } = input
        return await serviceProviderService.updateServiceProvider(serviceProviderId, data)
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to update serviceProvider',
        })
      }
    }),

  // Delete a serviceProvider
  delete: protectedProcedure
    .input(serviceProviderIdSchema)
    .mutation(async ({ input }) => {
      try {
        await serviceProviderService.deleteServiceProvider(input.serviceProviderId)
        return { success: true }
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to delete serviceProvider',
        })
      }
    }),

  // Add a service to a serviceProvider
  addService: protectedProcedure
    .input(createServiceProviderServiceSchema)
    .mutation(async ({ input }) => {
      try {
        return await serviceProviderService.addServiceProviderService(input)
      } catch (error: any) {
        if (error.code === 'NOT_FOUND' || error.code === 'CONFLICT') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to add service',
        })
      }
    }),

  // Update a serviceProvider service
  updateService: protectedProcedure
    .input(z.object({
      serviceId: z.string().uuid(),
      ...updateServiceProviderServiceSchema.shape,
    }))
    .mutation(async ({ input }) => {
      try {
        const { serviceId, ...data } = input
        return await serviceProviderService.updateServiceProviderService(serviceId, data)
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to update service',
        })
      }
    }),

  // Delete a serviceProvider service
  deleteService: protectedProcedure
    .input(z.object({
      serviceId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      try {
        await serviceProviderService.deleteServiceProviderService(input.serviceId)
        return { success: true }
      } catch (error: any) {
        if (error.code === 'NOT_FOUND' || error.code === 'PRECONDITION_FAILED') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to delete service',
        })
      }
    }),

  // List all categories
  listCategories: protectedProcedure
    .input(z.object({
      organizationId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      try {
        return await serviceProviderService.listCategories(input.organizationId)
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch categories',
        })
      }
    }),

  // Get serviceProviders by category
  getByCategory: protectedProcedure
    .input(z.object({
      organizationId: z.string().uuid(),
      categoryId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      try {
        return await serviceProviderService.getServiceProvidersByCategory(
          input.organizationId,
          input.categoryId
        )
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch serviceProviders by category',
        })
      }
    }),

  // Create a new category
  createCategory: protectedProcedure
    .input(createServiceCategorySchema)
    .mutation(async ({ input }) => {
      try {
        return await serviceProviderService.createCategory(input)
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to create category',
        })
      }
    }),

  // Update a category
  updateCategory: protectedProcedure
    .input(serviceCategoryIdSchema.merge(updateServiceCategorySchema))
    .mutation(async ({ input }) => {
      try {
        const { categoryId, ...data } = input
        return await serviceProviderService.updateCategory(categoryId, data)
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to update category',
        })
      }
    }),

  // Delete a category
  deleteCategory: protectedProcedure
    .input(serviceCategoryIdSchema)
    .mutation(async ({ input }) => {
      try {
        await serviceProviderService.deleteCategory(input.categoryId)
        return { success: true }
      } catch (error: any) {
        if (error.code === 'NOT_FOUND' || error.code === 'PRECONDITION_FAILED') {
          throw error
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to delete category',
        })
      }
    }),

  // Update category orders
  updateCategoryOrders: protectedProcedure
    .input(z.array(updateCategoryOrderSchema))
    .mutation(async ({ input }) => {
      try {
        await serviceProviderService.updateCategoryOrders(input)
        return { success: true }
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to update category orders',
        })
      }
    }),
})