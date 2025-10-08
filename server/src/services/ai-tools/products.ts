import { prisma } from '../../db'
import type { ToolRegistry } from './types'
import { sharedParams } from './shared-params'
import { TRPCError } from '@trpc/server'

/**
 * Product-related AI tools
 */
export const productTools: ToolRegistry = {
  searchProducts: {
    successMessage: 'Products found',
    errorMessage: 'Failed to search products',
    tool: {
      type: 'function',
      function: {
        name: 'searchProducts',
        description:
          'Search and list products by name. Use this to find products before updating or deleting them, or to look up product information.',
        parameters: {
          type: 'object',
          properties: {
            siteId: {
              type: 'string',
              description: 'Site ID to search products in (required)',
            },
            query: {
              type: 'string',
              description: 'Search query to filter products by name (optional)',
            },
            type: {
              type: 'string',
              enum: ['SERVICE', 'PHYSICAL', 'EXTERNAL_SERVICE'],
              description: 'Filter by product type (optional)',
            },
            isActive: {
              type: 'boolean',
              description: 'Filter by active status (optional, default: true)',
            },
          },
          required: ['siteId'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const { siteId, query, type, isActive } = args

      // Verify user has access to site
      const siteUser = await prisma.siteUser.findUnique({
        where: {
          userId_siteId: {
            userId,
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
          ...(query && {
            name: {
              contains: query,
              mode: 'insensitive' as const,
            },
          }),
          ...(type && { type }),
          ...(isActive !== undefined && { isActive }),
        },
        take: 10, // Limit results
        orderBy: {
          createdAt: 'desc',
        },
      })

      return products
    },
  },

  createProduct: {
    successMessage: 'Product created successfully',
    errorMessage: 'Failed to create product',
    tool: {
      type: 'function',
      function: {
        name: 'createProduct',
        description:
          'Create a new product (service or physical item) in the catalog. Use this when the user wants to add a new product.',
        parameters: {
          type: 'object',
          properties: sharedParams.product,
          required: ['siteId', 'name', 'type', 'price', 'currency'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const { siteId, ...productData } = args

      // Check if user has permission to create products
      const siteUser = await prisma.siteUser.findUnique({
        where: {
          userId_siteId: {
            userId,
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
    },
  },

  updateProduct: {
    successMessage: 'Product updated successfully',
    errorMessage: 'Failed to update product',
    tool: {
      type: 'function',
      function: {
        name: 'updateProduct',
        description:
          'Update an existing product. Use this when the user wants to modify product details or pricing.',
        parameters: {
          type: 'object',
          properties: {
            ...sharedParams.common,
            ...sharedParams.product,
          },
          required: ['id'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const { id, ...updateData } = args

      // Check if product exists and user has access
      const existingProduct = await prisma.product.findFirst({
        where: {
          id,
        },
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
      })

      if (!existingProduct || existingProduct.site.siteUsers.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        })
      }

      // Check permission
      const siteUser = existingProduct.site.siteUsers[0]
      if (siteUser.role === 'VIEWER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update products',
        })
      }

      const product = await prisma.product.update({
        where: { id },
        data: updateData,
      })

      return product
    },
  },

  deleteProduct: {
    successMessage: 'Product deleted successfully',
    errorMessage: 'Failed to delete product',
    tool: {
      type: 'function',
      function: {
        name: 'deleteProduct',
        description:
          'Delete a product. Use this when the user wants to remove a product from the catalog.',
        parameters: {
          type: 'object',
          properties: sharedParams.common,
          required: ['id'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const { id } = args

      // Check if product exists and user has access
      const existingProduct = await prisma.product.findFirst({
        where: {
          id,
        },
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
      })

      if (!existingProduct || existingProduct.site.siteUsers.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        })
      }

      // Check permission
      const siteUser = existingProduct.site.siteUsers[0]
      if (!['OWNER', 'ADMIN'].includes(siteUser.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete products',
        })
      }

      // Check if product is used in events
      const eventProduct = await prisma.eventProduct.findFirst({
        where: {
          productId: id,
        },
      })

      if (eventProduct) {
        // Deactivate instead of delete
        await prisma.product.update({
          where: { id },
          data: { isActive: false },
        })
        return { message: 'Product deactivated (used in events)' }
      }

      // Soft delete
      await prisma.product.delete({
        where: { id },
      })

      return { message: 'Product deleted successfully' }
    },
  },
}
