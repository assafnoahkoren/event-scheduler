import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

class StockLevelsService {
  async assertSiteAccess(userId: string, siteId: string) {
    const siteUser = await prisma.siteUser.findUnique({
      where: { userId_siteId: { userId, siteId } },
    })
    if (!siteUser) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this site' })
    }
    return siteUser
  }

  /**
   * Returns all (item, location, balance) rows for a site.
   * Fetches all items/locations for the site first, then aggregates the ledger.
   */
  async list(userId: string, siteId: string) {
    await this.assertSiteAccess(userId, siteId)

    // Get all items and locations for this site
    const [items, locations] = await Promise.all([
      prisma.stockItem.findMany({ where: { siteId, isDeleted: false }, include: { category: true } }),
      prisma.stockLocation.findMany({ where: { siteId, isDeleted: false } }),
    ])

    const itemIds = items.map((i) => i.id)
    const locationIds = locations.map((l) => l.id)

    // Aggregate ledger
    const ledger = await prisma.stockLedgerEntry.groupBy({
      by: ['itemId', 'locationId'],
      where: { itemId: { in: itemIds }, locationId: { in: locationIds } },
      _sum: { quantityDelta: true },
    })

    // Build lookup map
    const balanceMap = new Map<string, number>()
    for (const row of ledger) {
      balanceMap.set(`${row.itemId}:${row.locationId}`, row._sum.quantityDelta ?? 0)
    }

    return {
      items,
      locations,
      /** balances[itemId][locationId] = quantity */
      balances: Object.fromEntries(
        items.map((item) => [
          item.id,
          Object.fromEntries(
            locations.map((loc) => [
              loc.id,
              balanceMap.get(`${item.id}:${loc.id}`) ?? 0,
            ])
          ),
        ])
      ),
    }
  }

  /** All items and their quantities at a specific location (for recount flow). */
  async getByLocation(userId: string, locationId: string) {
    const location = await prisma.stockLocation.findFirst({
      where: { id: locationId, isDeleted: false },
      include: { site: { include: { siteUsers: { where: { userId } } } } },
    })
    if (!location || location.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Location not found' })
    }

    const items = await prisma.stockItem.findMany({
      where: { siteId: location.siteId, isDeleted: false, isActive: true },
      orderBy: { name: 'asc' },
    })

    const ledger = await prisma.stockLedgerEntry.groupBy({
      by: ['itemId'],
      where: { locationId, itemId: { in: items.map((i) => i.id) } },
      _sum: { quantityDelta: true },
    })

    const balanceMap = new Map(ledger.map((r) => [r.itemId, r._sum.quantityDelta ?? 0]))

    return items.map((item) => ({
      item,
      balance: balanceMap.get(item.id) ?? 0,
    }))
  }

  /** All locations and their quantities for a specific item. */
  async getByItem(userId: string, itemId: string) {
    const item = await prisma.stockItem.findFirst({
      where: { id: itemId, isDeleted: false },
      include: { site: { include: { siteUsers: { where: { userId } } } } },
    })
    if (!item || item.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Stock item not found' })
    }

    const locations = await prisma.stockLocation.findMany({
      where: { siteId: item.siteId, isDeleted: false, isActive: true },
      orderBy: { name: 'asc' },
    })

    const ledger = await prisma.stockLedgerEntry.groupBy({
      by: ['locationId'],
      where: { itemId, locationId: { in: locations.map((l) => l.id) } },
      _sum: { quantityDelta: true },
    })

    const balanceMap = new Map(ledger.map((r) => [r.locationId, r._sum.quantityDelta ?? 0]))

    return locations.map((loc) => ({
      location: loc,
      balance: balanceMap.get(loc.id) ?? 0,
    }))
  }
}

export const stockLevelsService = new StockLevelsService()
