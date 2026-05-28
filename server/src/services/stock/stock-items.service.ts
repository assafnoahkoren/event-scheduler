import { z } from 'zod'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

export const createStockItemSchema = z.object({
  siteId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  unit: z.string().min(1),
})

export const updateStockItemSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  unit: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})

export type CreateStockItemInput = z.infer<typeof createStockItemSchema>
export type UpdateStockItemInput = z.infer<typeof updateStockItemSchema>

class StockItemsService {
  async assertSiteAccess(userId: string, siteId: string) {
    const siteUser = await prisma.siteUser.findUnique({
      where: { userId_siteId: { userId, siteId } },
    })
    if (!siteUser) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this site' })
    }
    return siteUser
  }

  async list(userId: string, siteId: string) {
    await this.assertSiteAccess(userId, siteId)
    return prisma.stockItem.findMany({
      where: { siteId, isDeleted: false },
      include: { category: true },
      orderBy: { name: 'asc' },
    })
  }

  async get(userId: string, id: string) {
    const item = await prisma.stockItem.findFirst({
      where: { id, isDeleted: false },
      include: {
        category: true,
        site: { include: { siteUsers: { where: { userId } } } },
      },
    })
    if (!item || item.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Stock item not found' })
    }
    return item
  }

  async create(userId: string, input: CreateStockItemInput) {
    const siteUser = await this.assertSiteAccess(userId, input.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    return prisma.stockItem.create({ data: input })
  }

  async update(userId: string, input: UpdateStockItemInput) {
    const { id, ...data } = input
    const item = await this.get(userId, id)
    const siteUser = await this.assertSiteAccess(userId, item.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    return prisma.stockItem.update({ where: { id }, data })
  }

  async delete(userId: string, id: string) {
    const item = await this.get(userId, id)
    const siteUser = await this.assertSiteAccess(userId, item.siteId)
    if (!['OWNER', 'ADMIN'].includes(siteUser.role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    await prisma.stockItem.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    })
    return { success: true }
  }
}

export const stockItemsService = new StockItemsService()
