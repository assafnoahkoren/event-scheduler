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

    const previousQuantity = await this.getBalance(input.itemId, input.locationId)
    const hasHistory = await this.hasAnyLedgerEntries(input.itemId, input.locationId)
    const adjustmentDelta = input.countedQuantity - previousQuantity

    // INITIAL_COUNT when no prior history, RECOUNT_ADJUSTMENT otherwise
    const operationType = !hasHistory ? 'INITIAL_COUNT' : 'RECOUNT_ADJUSTMENT'

    const recountId = uuidv4()

    await prisma.$transaction([
      prisma.stockRecount.create({
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
      }),
      prisma.stockLedgerEntry.create({
        data: {
          itemId: input.itemId,
          locationId: input.locationId,
          quantityDelta: adjustmentDelta,
          operationType,
          referenceId: recountId,
        },
      }),
    ])

    return prisma.stockRecount.findUnique({
      where: { id: recountId },
      include: { item: true, location: true },
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
