import { prisma } from '../../db'
import type { ToolRegistry } from './types'
import { sharedParams } from './shared-params'
import { TRPCError } from '@trpc/server'

/**
 * Event-Product relationship AI tools
 */
export const eventProductTools: ToolRegistry = {
  addProductToEvent: {
    successMessage: 'Product added to event successfully',
    errorMessage: 'Failed to add product to event',
    tool: {
      type: 'function',
      function: {
        name: 'addProductToEvent',
        description:
          'Add a product or service to an event. Use this when the user wants to attach a product/service to an event.',
        parameters: {
          type: 'object',
          properties: sharedParams.eventProduct,
          required: ['eventId', 'productId', 'quantity', 'price'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const { eventId, productId, quantity, price, currency, notes } = args

      // Verify user has access to the event
      const event = await prisma.event.findFirst({
        where: {
          id: eventId,
          site: {
            siteUsers: {
              some: {
                userId,
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

      // Verify product exists and belongs to same site
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          siteId: event.siteId,
        },
      })

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        })
      }

      const eventProduct = await prisma.eventProduct.create({
        data: {
          eventId,
          productId,
          quantity,
          price,
          currency,
          notes,
        },
      })

      return eventProduct
    },
  },

  updateEventProduct: {
    successMessage: 'Event product updated successfully',
    errorMessage: 'Failed to update event product',
    tool: {
      type: 'function',
      function: {
        name: 'updateEventProduct',
        description:
          'Update product details for an event (quantity, price, notes). Use this when user wants to modify a product already added to an event.',
        parameters: {
          type: 'object',
          properties: {
            ...sharedParams.common,
            ...sharedParams.eventProduct,
          },
          required: ['id'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const { id, ...updateData } = args

      // Get event product with event details
      const eventProduct = await prisma.eventProduct.findFirst({
        where: {
          id,
        },
        include: {
          event: {
            include: {
              site: {
                include: {
                  siteUsers: {
                    where: {
                      userId,
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

      return await prisma.eventProduct.update({
        where: { id },
        data: updateData,
      })
    },
  },

  removeProductFromEvent: {
    successMessage: 'Product removed from event successfully',
    errorMessage: 'Failed to remove product from event',
    dangerous: true,
    tool: {
      type: 'function',
      function: {
        name: 'removeProductFromEvent',
        description:
          'Remove a product from an event. Use this when user wants to detach a product/service from an event.',
        parameters: {
          type: 'object',
          properties: sharedParams.common,
          required: ['id'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const { id } = args

      // Get event product to verify permissions
      const eventProduct = await prisma.eventProduct.findFirst({
        where: {
          id,
        },
        include: {
          event: {
            include: {
              site: {
                include: {
                  siteUsers: {
                    where: {
                      userId,
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

      await prisma.eventProduct.delete({
        where: { id },
      })

      return { message: 'Product removed from event' }
    },
  },
}
