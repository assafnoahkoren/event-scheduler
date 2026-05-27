import { z } from 'zod'
import { PurchaseOrderStatus } from '@prisma/client'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

export const createPurchaseOrderSchema = z.object({
  siteId: z.string().uuid(),
  supplierName: z.string().optional(),
  notes: z.string().optional(),
  orderDate: z.string().datetime(),
  expectedDeliveryDate: z.string().datetime().optional(),
  lines: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        orderedQuantity: z.number().positive(),
      })
    )
    .min(1, 'At least one line item is required'),
})

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>

class PurchaseOrdersService {
  async assertSiteAccess(userId: string, siteId: string) {
    const siteUser = await prisma.siteUser.findUnique({
      where: { userId_siteId: { userId, siteId } },
    })
    if (!siteUser) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this site' })
    }
    return siteUser
  }

  async list(userId: string, siteId: string, status?: PurchaseOrderStatus) {
    await this.assertSiteAccess(userId, siteId)
    return prisma.purchaseOrder.findMany({
      where: {
        siteId,
        isDeleted: false,
        ...(status ? { status } : {}),
      },
      include: {
        orderLines: {
          where: { isDeleted: false },
          include: {
            item: true,
            arrivals: { where: { isDeleted: false } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { orderDate: 'desc' },
    })
  }

  async get(userId: string, id: string) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id, isDeleted: false },
      include: {
        orderLines: {
          where: { isDeleted: false },
          include: {
            item: true,
            arrivals: {
              where: { isDeleted: false },
              include: { location: true },
              orderBy: { arrivedAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        site: { include: { siteUsers: { where: { userId } } } },
      },
    })
    if (!order || order.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' })
    }
    return order
  }

  async create(userId: string, input: CreatePurchaseOrderInput) {
    const siteUser = await this.assertSiteAccess(userId, input.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }

    const { lines, orderDate, expectedDeliveryDate, ...orderFields } = input

    return prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          ...orderFields,
          orderDate: new Date(orderDate),
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
          orderLines: {
            create: lines.map((line) => ({
              itemId: line.itemId,
              orderedQuantity: line.orderedQuantity,
            })),
          },
        },
        include: {
          orderLines: {
            include: { item: true },
          },
        },
      })
      return order
    })
  }

  async cancel(userId: string, id: string) {
    const order = await this.get(userId, id)
    const siteUser = await this.assertSiteAccess(userId, order.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    if (order.status === 'COMPLETE') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot cancel a completed order' })
    }
    return prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })
  }
}

export const purchaseOrdersService = new PurchaseOrdersService()
