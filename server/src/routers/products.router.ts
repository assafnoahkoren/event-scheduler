import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '../db'
import { TRPCError } from '@trpc/server'

const productTypeSchema = z.enum(['SERVICE', 'PHYSICAL', 'EXTERNAL_SERVICE'])

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  type: productTypeSchema,
  price: z.number().min(0, 'Price must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  isActive: z.boolean().default(true),
  siteId: z.string(),
})

const updateProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  type: productTypeSchema,
  price: z.number().min(0, 'Price must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  isActive: z.boolean(),
})

export const productsRouter = router({
  // List all products for the current site
  list: protectedProcedure
    .input(z.object({ siteId: z.string() }).optional())
    .query(async ({ ctx, input }) => {
      // Get the user's sites to find default if no siteId provided
      let siteId = input?.siteId

      if (!siteId) {
        // Get the user's first site as default
        const userSite = await prisma.siteUser.findFirst({
          where: {
            userId: ctx.user.id,
          },
          include: {
            site: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        })

        if (!userSite) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No sites found for user',
          })
        }

        siteId = userSite.siteId
      }

      // Verify user has access to the site
      const siteUser = await prisma.siteUser.findUnique({
        where: {
          userId_siteId: {
            userId: ctx.user.id,
            siteId,
          },
        },
      })

      if (!siteUser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this site',
        })
      }

      const products = await prisma.product.findMany({
        where: {
          siteId,
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return products
    }),

  // Get a single product by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await prisma.product.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
        include: {
          site: {
            include: {
              siteUsers: {
                where: {
                  userId: ctx.user.id,
                },
              },
            },
          },
        },
      })

      if (!product || product.site.siteUsers.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        })
      }

      return product
    }),

  // Create a new product
  create: protectedProcedure
    .input(createProductSchema)
    .mutation(async ({ ctx, input }) => {
      const { siteId, ...productData } = input

      // Check if user has permission to create products
      const siteUser = await prisma.siteUser.findUnique({
        where: {
          userId_siteId: {
            userId: ctx.user.id,
            siteId,
          },
        },
      })

      if (!siteUser || siteUser.role === 'VIEWER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create products',
        })
      }

      const product = await prisma.product.create({
        data: {
          ...productData,
          siteId,
        },
      })

      return product
    }),

  // Update a product
  update: protectedProcedure
    .input(updateProductSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if product exists and user has access
      const existingProduct = await prisma.product.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
        include: {
          site: {
            include: {
              siteUsers: {
                where: {
                  userId: ctx.user.id,
                },
              },
            },
          },
        },
      })

      if (!existingProduct || existingProduct.site.siteUsers.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        })
      }

      const siteId = existingProduct.siteId

      // Check if user has permission to update products
      const siteUser = await prisma.siteUser.findUnique({
        where: {
          userId_siteId: {
            userId: ctx.user.id,
            siteId,
          },
        },
      })

      if (!siteUser || siteUser.role === 'VIEWER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update products',
        })
      }

      const { id, ...updateData } = input

      const product = await prisma.product.update({
        where: { id },
        data: updateData,
      })

      return product
    }),

  // Delete a product (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if product exists and user has access
      const existingProduct = await prisma.product.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
        include: {
          site: {
            include: {
              siteUsers: {
                where: {
                  userId: ctx.user.id,
                },
              },
            },
          },
        },
      })

      if (!existingProduct || existingProduct.site.siteUsers.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        })
      }

      const siteId = existingProduct.siteId

      // Check if user has permission to delete products
      const siteUser = await prisma.siteUser.findUnique({
        where: {
          userId_siteId: {
            userId: ctx.user.id,
            siteId,
          },
        },
      })

      if (!siteUser || !['OWNER', 'ADMIN'].includes(siteUser.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete products',
        })
      }

      // Check if product is used in any events
      const eventProducts = await prisma.eventProduct.findFirst({
        where: {
          productId: input.id,
        },
      })

      if (eventProducts) {
        // Instead of hard delete, just mark as inactive
        await prisma.product.update({
          where: { id: input.id },
          data: { isActive: false },
        })

        return { message: 'Product deactivated (used in events)' }
      }

      // Soft delete the product
      await prisma.product.delete({
        where: { id: input.id },
      })

      return { message: 'Product deleted successfully' }
    }),
})