import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

export const createStockRecountSchema = z.object({
  siteId: z.string().uuid(),
  itemId: z.string().uuid(),
  locationId: z.string().uuid(),
  countedQuantity: z.number().min(0),
  countedAt: z.string().datetime(),
  notes: z.string().optional(),
})

export type CreateStockRecountInput = z.infer<typeof createStockRecountSchema>

class StockRecountsService {
  async assertSiteAccess(userId: string, siteId: string) {
    const siteUser = await prisma.siteUser.findUnique({
      where: { userId_siteId: { userId, siteId } },
    })
    if (!siteUser) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this site' })
    }
    return siteUser
  }

  async getBalance(itemId: string, locationId: string): Promise<number> {
    const result = await prisma.stockLedgerEntry.aggregate({
      where: { itemId, locationId },
      _sum: { quantityDelta: true },
    })
    return result._sum.quantityDelta ?? 0
  }

  async hasAnyLedgerEntries(itemId: string, locationId: string): Promise<boolean> {
    const count = await prisma.stockLedgerEntry.count({ where: { itemId, locationId } })
    return count > 0
  }

  async create(userId: string, input: CreateStockRecountInput) {
    const siteUser = await this.assertSiteAccess(userId, input.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }

    const recountId = uuidv4()

    return prisma.$transaction(async (tx) => {
      // Read current balance and history INSIDE the transaction
      const ledgerResult = await tx.stockLedgerEntry.aggregate({
        where: { itemId: input.itemId, locationId: input.locationId },
        _sum: { quantityDelta: true },
      })
      const previousQuantity = ledgerResult._sum.quantityDelta ?? 0

      const historyCount = await tx.stockLedgerEntry.count({
        where: { itemId: input.itemId, locationId: input.locationId },
      })
      const hasHistory = historyCount > 0

      const adjustmentDelta = input.countedQuantity - previousQuantity
      const operationType = !hasHistory ? 'INITIAL_COUNT' : 'RECOUNT_ADJUSTMENT'

      const recount = await tx.stockRecount.create({
        data: {
          id: recountId,
          siteId: input.siteId,
          itemId: input.itemId,
          locationId: input.locationId,
          countedQuantity: input.countedQuantity,
          previousQuantity,
          countedAt: new Date(input.countedAt),
          notes: input.notes,
        },
      })

      await tx.stockLedgerEntry.create({
        data: {
          itemId: input.itemId,
          locationId: input.locationId,
          quantityDelta: adjustmentDelta,
          operationType,
          referenceId: recountId,
        },
      })

      return tx.stockRecount.findUnique({
        where: { id: recount.id },
        include: { item: true, location: true },
      })
    })
  }

  async list(userId: string, input: { siteId: string; locationId?: string; itemId?: string }) {
    await this.assertSiteAccess(userId, input.siteId)
    return prisma.stockRecount.findMany({
      where: {
        siteId: input.siteId,
        isDeleted: false,
        ...(input.locationId ? { locationId: input.locationId } : {}),
        ...(input.itemId ? { itemId: input.itemId } : {}),
      },
      include: { item: true, location: true },
      orderBy: { countedAt: 'desc' },
    })
  }
}

export const stockRecountsService = new StockRecountsService()
