import { z } from 'zod'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

export const createStockLocationSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
})

export const updateStockLocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type CreateStockLocationInput = z.infer<typeof createStockLocationSchema>
export type UpdateStockLocationInput = z.infer<typeof updateStockLocationSchema>

class StockLocationsService {
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
    return prisma.stockLocation.findMany({
      where: { siteId, isDeleted: false },
      orderBy: { name: 'asc' },
    })
  }

  async get(userId: string, id: string) {
    const location = await prisma.stockLocation.findFirst({
      where: { id, isDeleted: false },
      include: { site: { include: { siteUsers: { where: { userId } } } } },
    })
    if (!location || location.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Stock location not found' })
    }
    return location
  }

  async create(userId: string, input: CreateStockLocationInput) {
    const siteUser = await this.assertSiteAccess(userId, input.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    return prisma.stockLocation.create({ data: input })
  }

  async update(userId: string, input: UpdateStockLocationInput) {
    const { id, ...data } = input
    const location = await this.get(userId, id)
    const siteUser = await this.assertSiteAccess(userId, location.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    return prisma.stockLocation.update({ where: { id }, data })
  }

  async delete(userId: string, id: string) {
    const location = await this.get(userId, id)
    const siteUser = await this.assertSiteAccess(userId, location.siteId)
    if (!['OWNER', 'ADMIN'].includes(siteUser.role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    await prisma.stockLocation.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    })
    return { success: true }
  }
}

export const stockLocationsService = new StockLocationsService()
