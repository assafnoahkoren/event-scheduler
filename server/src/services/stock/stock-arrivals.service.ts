import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

export const createStockArrivalSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().positive(),
  arrivedAt: z.string().datetime(),
  notes: z.string().optional(),
})

export type CreateStockArrivalInput = z.infer<typeof createStockArrivalSchema>

class StockArrivalsService {
  async create(userId: string, input: CreateStockArrivalInput) {
    // Load PO with access check + existing arrivals for status computation
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: input.purchaseOrderId, isDeleted: false },
      include: {
        site: { include: { siteUsers: { where: { userId } } } },
        arrivals: { where: { isDeleted: false } },
      },
    })

    if (!order || order.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' })
    }

    const siteUser = order.site.siteUsers[0]
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }

    if (order.status === 'CANCELLED') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot add arrival to a cancelled order' })
    }

    // Compute new PO status based on cumulative arrivals
    const previousTotal = order.arrivals.reduce((sum, a) => sum + a.quantity, 0)
    const newTotal = previousTotal + input.quantity
    const newStatus =
      newTotal >= order.orderedQuantity ? 'COMPLETE' : newTotal > 0 ? 'PARTIAL' : 'OPEN'

    // Pre-generate UUID so we can reference it in the ledger entry atomically
    const arrivalId = uuidv4()

    const [arrival] = await prisma.$transaction([
      prisma.stockArrival.create({
        data: {
          id: arrivalId,
          purchaseOrderId: input.purchaseOrderId,
          locationId: input.locationId,
          quantity: input.quantity,
          arrivedAt: new Date(input.arrivedAt),
          notes: input.notes,
        },
      }),
      prisma.stockLedgerEntry.create({
        data: {
          itemId: order.itemId,
          locationId: input.locationId,
          quantityDelta: input.quantity,
          operationType: 'ARRIVAL',
          referenceId: arrivalId,
        },
      }),
      prisma.purchaseOrder.update({
        where: { id: input.purchaseOrderId },
        data: { status: newStatus },
      }),
    ])

    return arrival
  }

  async list(userId: string, purchaseOrderId: string) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, isDeleted: false },
      include: { site: { include: { siteUsers: { where: { userId } } } } },
    })
    if (!order || order.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' })
    }
    return prisma.stockArrival.findMany({
      where: { purchaseOrderId, isDeleted: false },
      include: { location: true },
      orderBy: { arrivedAt: 'desc' },
    })
  }
}

export const stockArrivalsService = new StockArrivalsService()
