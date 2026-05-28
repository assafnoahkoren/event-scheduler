import { z } from 'zod'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

export const createStockItemCategorySchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().optional(),
})

export const updateStockItemCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  color: z.string().optional(),
})

export type CreateStockItemCategoryInput = z.infer<typeof createStockItemCategorySchema>
export type UpdateStockItemCategoryInput = z.infer<typeof updateStockItemCategorySchema>

class StockItemCategoriesService {
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
    return prisma.stockItemCategory.findMany({
      where: { siteId, isDeleted: false },
      orderBy: { name: 'asc' },
    })
  }

  async create(userId: string, input: CreateStockItemCategoryInput) {
    const siteUser = await this.assertSiteAccess(userId, input.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    return prisma.stockItemCategory.create({ data: input })
  }

  async update(userId: string, input: UpdateStockItemCategoryInput) {
    const category = await prisma.stockItemCategory.findFirst({
      where: { id: input.id, isDeleted: false },
      include: { site: { include: { siteUsers: { where: { userId } } } } },
    })
    if (!category || category.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' })
    }
    const siteUser = category.site.siteUsers[0]
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    return prisma.stockItemCategory.update({ where: { id: input.id }, data: input })
  }

  async delete(userId: string, id: string) {
    const category = await prisma.stockItemCategory.findFirst({
      where: { id, isDeleted: false },
      include: { site: { include: { siteUsers: { where: { userId } } } } },
    })
    if (!category || category.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' })
    }
    const siteUser = category.site.siteUsers[0]
    if (!['OWNER', 'ADMIN'].includes(siteUser.role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    await prisma.stockItemCategory.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    })
    return { success: true }
  }
}

export const stockItemCategoriesService = new StockItemCategoriesService()
