import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { PurchaseOrderStatus } from '@prisma/client'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

export const createStockArrivalSchema = z.object({
  purchaseOrderLineId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().positive(),
  arrivedAt: z.string().datetime(),
  notes: z.string().optional(),
})

export type CreateStockArrivalInput = z.infer<typeof createStockArrivalSchema>

/** Derive order-level status from line statuses. */
function deriveOrderStatus(lineStatuses: PurchaseOrderStatus[]): PurchaseOrderStatus {
  if (lineStatuses.every((s) => s === 'COMPLETE')) return 'COMPLETE'
  if (lineStatuses.some((s) => s === 'PARTIAL' || s === 'COMPLETE')) return 'PARTIAL'
  return 'OPEN'
}

class StockArrivalsService {
  async create(userId: string, input: CreateStockArrivalInput) {
    return prisma.$transaction(async (tx) => {
      // Load the line + its order (for access check) + its existing arrivals
      const line = await tx.purchaseOrderLine.findFirst({
        where: { id: input.purchaseOrderLineId, isDeleted: false },
        include: {
          purchaseOrder: {
            include: { site: { include: { siteUsers: { where: { userId } } } } },
          },
          arrivals: { where: { isDeleted: false } },
        },
      })

      if (!line || line.purchaseOrder.site.siteUsers.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order line not found' })
      }

      const siteUser = line.purchaseOrder.site.siteUsers[0]
      if (siteUser.role === 'VIEWER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
      }

      if (line.purchaseOrder.status === 'CANCELLED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot add arrival to a cancelled order' })
      }

      // Compute new line status
      const prevLineTotal = line.arrivals.reduce((sum, a) => sum + a.quantity, 0)
      const newLineTotal = prevLineTotal + input.quantity
      const newLineStatus: PurchaseOrderStatus =
        newLineTotal >= line.orderedQuantity ? 'COMPLETE' : 'PARTIAL'

      // Pre-generate arrival ID so ledger entry can reference it atomically
      const arrivalId = uuidv4()

      // Write arrival + ledger entry + update line status
      await tx.stockArrival.create({
        data: {
          id: arrivalId,
          purchaseOrderLineId: input.purchaseOrderLineId,
          locationId: input.locationId,
          quantity: input.quantity,
          arrivedAt: new Date(input.arrivedAt),
          notes: input.notes,
        },
      })

      await tx.stockLedgerEntry.create({
        data: {
          itemId: line.itemId,
          locationId: input.locationId,
          quantityDelta: input.quantity,
          operationType: 'ARRIVAL',
          referenceId: arrivalId,
        },
      })

      await tx.purchaseOrderLine.update({
        where: { id: input.purchaseOrderLineId },
        data: { status: newLineStatus },
      })

      // Recompute order-level status from all non-deleted lines
      const allLines = await tx.purchaseOrderLine.findMany({
        where: { purchaseOrderId: line.purchaseOrderId, isDeleted: false },
        select: { id: true, status: true },
      })

      const lineStatuses = allLines.map((l) =>
        l.id === input.purchaseOrderLineId ? newLineStatus : l.status
      )
      const newOrderStatus = deriveOrderStatus(lineStatuses)

      await tx.purchaseOrder.update({
        where: { id: line.purchaseOrderId },
        data: { status: newOrderStatus },
      })

      return tx.stockArrival.findUniqueOrThrow({
        where: { id: arrivalId },
        include: { location: true, purchaseOrderLine: { include: { item: true } } },
      })
    })
  }

  async list(userId: string, purchaseOrderLineId: string) {
    const line = await prisma.purchaseOrderLine.findFirst({
      where: { id: purchaseOrderLineId, isDeleted: false },
      include: {
        purchaseOrder: {
          include: { site: { include: { siteUsers: { where: { userId } } } } },
        },
      },
    })
    if (!line || line.purchaseOrder.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order line not found' })
    }
    return prisma.stockArrival.findMany({
      where: { purchaseOrderLineId, isDeleted: false },
      include: { location: true },
      orderBy: { arrivedAt: 'desc' },
    })
  }
}

export const stockArrivalsService = new StockArrivalsService()
