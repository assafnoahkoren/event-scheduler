import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

export const createStockMovementSchema = z.object({
  siteId: z.string().uuid(),
  itemId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  quantity: z.number().positive(),
  movedAt: z.string().datetime(),
  notes: z.string().optional(),
})

export const listStockMovementsSchema = z.object({
  siteId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
})

export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>

class StockMovementsService {
  async assertSiteAccess(userId: string, siteId: string) {
    const siteUser = await prisma.siteUser.findUnique({
      where: { userId_siteId: { userId, siteId } },
    })
    if (!siteUser) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this site' })
    }
    return siteUser
  }

  /** Returns the current balance for (itemId, locationId) from the ledger. */
  async getBalance(itemId: string, locationId: string): Promise<number> {
    const result = await prisma.stockLedgerEntry.aggregate({
      where: { itemId, locationId },
      _sum: { quantityDelta: true },
    })
    return result._sum.quantityDelta ?? 0
  }

  async create(userId: string, input: CreateStockMovementInput) {
    const siteUser = await this.assertSiteAccess(userId, input.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }

    if (input.fromLocationId === input.toLocationId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'From and To locations must differ' })
    }

    // Validate sufficient stock at source location
    const available = await this.getBalance(input.itemId, input.fromLocationId)
    if (available < input.quantity) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Insufficient stock: ${available} available, ${input.quantity} requested`,
      })
    }

    const movementId = uuidv4()

    await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          id: movementId,
          siteId: input.siteId,
          itemId: input.itemId,
          fromLocationId: input.fromLocationId,
          toLocationId: input.toLocationId,
          quantity: input.quantity,
          movedAt: new Date(input.movedAt),
          notes: input.notes,
        },
      }),
      prisma.stockLedgerEntry.create({
        data: {
          itemId: input.itemId,
          locationId: input.fromLocationId,
          quantityDelta: -input.quantity,
          operationType: 'MOVEMENT_OUT',
          referenceId: movementId,
        },
      }),
      prisma.stockLedgerEntry.create({
        data: {
          itemId: input.itemId,
          locationId: input.toLocationId,
          quantityDelta: input.quantity,
          operationType: 'MOVEMENT_IN',
          referenceId: movementId,
        },
      }),
    ])

    return prisma.stockMovement.findUnique({
      where: { id: movementId },
      include: { item: true, fromLocation: true, toLocation: true },
    })
  }

  async list(userId: string, input: { siteId: string; itemId?: string; locationId?: string }) {
    await this.assertSiteAccess(userId, input.siteId)
    return prisma.stockMovement.findMany({
      where: {
        siteId: input.siteId,
        isDeleted: false,
        ...(input.itemId ? { itemId: input.itemId } : {}),
        ...(input.locationId
          ? { OR: [{ fromLocationId: input.locationId }, { toLocationId: input.locationId }] }
          : {}),
      },
      include: { item: true, fromLocation: true, toLocation: true },
      orderBy: { movedAt: 'desc' },
    })
  }
}

export const stockMovementsService = new StockMovementsService()
