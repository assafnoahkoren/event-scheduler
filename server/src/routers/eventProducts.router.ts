import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '../db'
import { TRPCError } from '@trpc/server'

export const eventProductsRouter = router({
  // List all products for an event
  list: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user has access to the event
      const event = await prisma.event.findFirst({
        where: {
          id: input.eventId,
          isDeleted: false,
          site: {
            siteUsers: {
              some: {
                userId: ctx.user.id,
              },
            },
          },
        },
      })

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        })
      }

      const eventProducts = await prisma.eventProduct.findMany({
        where: {
          eventId: input.eventId,
          product: {
            isDeleted: false,
            isActive: true,
          }
        },
        include: {
          product: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      return eventProducts
    }),

  // Add a product to an event
  add: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        productId: z.string(),
        quantity: z.number().min(1).default(1),
        price: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to the event and can edit it
      const event = await prisma.event.findFirst({
        where: {
          id: input.eventId,
          isDeleted: false,
          site: {
            siteUsers: {
              some: {
                userId: ctx.user.id,
                role: {
                  in: ['OWNER', 'ADMIN', 'EDITOR'],
                },
              },
            },
          },
        },
      })

      if (!event) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this event',
        })
      }

      // Verify product exists and belongs to the same site
      const product = await prisma.product.findFirst({
        where: {
          id: input.productId,
          siteId: event.siteId,
          isDeleted: false,
        },
      })

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        })
      }

      // Create new event product (allow multiple of same product)
      const eventProduct = await prisma.eventProduct.create({
        data: {
          eventId: input.eventId,
          productId: input.productId,
          quantity: input.quantity,
          price: input.price,
        },
      })

      return eventProduct
    }),

  // Update event product (quantity or price)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        quantity: z.number().min(1).optional(),
        price: z.number().min(0).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get event product with event details
      const eventProduct = await prisma.eventProduct.findFirst({
        where: {
          id: input.id,
        },
        include: {
          event: {
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
          },
        },
      })

      if (!eventProduct || eventProduct.event.site.siteUsers.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event product not found',
        })
      }

      const siteUser = eventProduct.event.site.siteUsers[0]
      if (siteUser.role === 'VIEWER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this event',
        })
      }

      const { id, ...updateData } = input

      return await prisma.eventProduct.update({
        where: { id },
        data: updateData,
      })
    }),

  // Remove a product from an event
  remove: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the event product to verify permissions
      const eventProduct = await prisma.eventProduct.findFirst({
        where: {
          id: input.id,
        },
        include: {
          event: {
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
          },
        },
      })

      if (!eventProduct || eventProduct.event.site.siteUsers.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event product not found',
        })
      }

      const siteUser = eventProduct.event.site.siteUsers[0]
      if (!['OWNER', 'ADMIN', 'EDITOR'].includes(siteUser.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this event',
        })
      }

      // Delete the event product
      await prisma.eventProduct.delete({
        where: {
          id: input.id,
        },
      })

      return { message: 'Product removed from event' }
    }),
})