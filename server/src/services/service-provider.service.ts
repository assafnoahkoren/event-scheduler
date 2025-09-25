import { z } from 'zod'
import { prisma } from '../db'
import { TRPCError } from '@trpc/server'

// ServiceProvider schemas
export const createServiceProviderSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(100),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  categoryId: z.string().uuid().optional(),
})

export const updateServiceProviderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  categoryId: z.string().uuid().optional(),
})

export const serviceProviderIdSchema = z.object({
  serviceProviderId: z.string().uuid(),
})

// ServiceProvider Service schemas
export const createServiceProviderServiceSchema = z.object({
  serviceProviderId: z.string().uuid(),
  name: z.string().min(1).max(100),
  categoryId: z.string().uuid().optional(),
  price: z.number().positive().optional(),
  providerPrice: z.number().positive().optional(),
  currency: z.string().max(3).optional(),
  fileLinks: z.array(z.string().url()).optional(),
})

export const updateServiceProviderServiceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  categoryId: z.string().uuid().optional(),
  price: z.number().positive().optional(),
  providerPrice: z.number().positive().optional(),
  currency: z.string().max(3).optional(),
  fileLinks: z.array(z.string().url()).optional(),
})

// Type exports
export type CreateServiceProviderInput = z.infer<typeof createServiceProviderSchema>
export type UpdateServiceProviderInput = z.infer<typeof updateServiceProviderSchema>
export type CreateServiceProviderServiceInput = z.infer<typeof createServiceProviderServiceSchema>
export type UpdateServiceProviderServiceInput = z.infer<typeof updateServiceProviderServiceSchema>

class ServiceProviderService {
  // ServiceProvider CRUD operations
  async listServiceProviders(organizationId: string, search?: string, includeDeleted = false) {
    return prisma.serviceProvider.findMany({
      where: {
        organizationId,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ]
        } : {}),
        ...(!includeDeleted ? { isDeleted: false } : {}),
      },
      include: {
        services: {
          where: { isDeleted: false },
          include: {
            category: true,
          },
        },
        _count: {
          select: { eventProviders: true }
        }
      },
      orderBy: { name: 'asc' },
    })
  }

  async getServiceProvider(serviceProviderId: string) {
    const serviceProvider = await prisma.serviceProvider.findFirst({
      where: {
        id: serviceProviderId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: { eventProviders: true },
        },
        category: true,
        services: {
          where: { isDeleted: false },
          include: {
            category: true,
          },
        },
        eventProviders: {
          where: { isDeleted: false },
          include: {
            event: {
              include: {
                client: true,
              }
            },
            providerService: {
              include: {
                category: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!serviceProvider) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'ServiceProvider not found',
      })
    }

    return serviceProvider
  }

  async createServiceProvider(input: CreateServiceProviderInput) {
    return prisma.serviceProvider.create({
      data: input,
      include: {
        services: {
          include: {
            category: true,
          },
        },
      },
    })
  }

  async updateServiceProvider(serviceProviderId: string, input: UpdateServiceProviderInput) {
    const serviceProvider = await prisma.serviceProvider.findFirst({
      where: { id: serviceProviderId, isDeleted: false },
    })

    if (!serviceProvider) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'ServiceProvider not found',
      })
    }

    return prisma.serviceProvider.update({
      where: { id: serviceProviderId },
      data: input,
      include: {
        services: {
          where: { isDeleted: false },
          include: {
            category: true,
          },
        },
      },
    })
  }

  async deleteServiceProvider(serviceProviderId: string) {
    const serviceProvider = await prisma.serviceProvider.findFirst({
      where: { id: serviceProviderId, isDeleted: false },
    })

    if (!serviceProvider) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'ServiceProvider not found',
      })
    }

    // Soft delete the serviceProvider and all their services
    await prisma.$transaction([
      prisma.serviceProvider.update({
        where: { id: serviceProviderId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }),
      prisma.serviceProviderService.updateMany({
        where: { providerId: serviceProviderId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }),
    ])
  }

  // ServiceProvider Service operations
  async addServiceProviderService(input: CreateServiceProviderServiceInput) {
    // Check if serviceProvider exists
    const serviceProvider = await prisma.serviceProvider.findFirst({
      where: { id: input.serviceProviderId, isDeleted: false },
    })

    if (!serviceProvider) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'ServiceProvider not found',
      })
    }

    // Check if category exists if provided
    if (input.categoryId) {
      const category = await prisma.serviceCategory.findFirst({
        where: { id: input.categoryId, isDeleted: false },
      })

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        })
      }

      // Check if service already exists with same category
      const existingService = await prisma.serviceProviderService.findFirst({
        where: {
          providerId: input.serviceProviderId,
          categoryId: input.categoryId,
          isDeleted: false,
        },
      })

      if (existingService) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This service already exists for this serviceProvider',
        })
      }
    }

    return prisma.serviceProviderService.create({
      data: {
        providerId: input.serviceProviderId,
        name: input.name,
        categoryId: input.categoryId,
        price: input.price,
        providerPrice: input.providerPrice,
        currency: input.currency,
        fileLinks: input.fileLinks || [],
      },
      include: {
        category: true,
      },
    })
  }

  async updateServiceProviderService(serviceId: string, input: UpdateServiceProviderServiceInput) {
    const service = await prisma.serviceProviderService.findFirst({
      where: { id: serviceId, isDeleted: false },
    })

    if (!service) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Service not found',
      })
    }

    // Check if category exists if provided
    if (input.categoryId) {
      const category = await prisma.serviceCategory.findFirst({
        where: { id: input.categoryId, isDeleted: false },
      })

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        })
      }
    }

    return prisma.serviceProviderService.update({
      where: { id: serviceId },
      data: input,
      include: {
        category: true,
      },
    })
  }

  async deleteServiceProviderService(serviceId: string) {
    const service = await prisma.serviceProviderService.findFirst({
      where: { id: serviceId, isDeleted: false },
    })

    if (!service) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Service not found',
      })
    }

    // Check if service is in use by any events
    const inUse = await prisma.eventProvider.findFirst({
      where: {
        providerServiceId: serviceId,
        isDeleted: false,
      },
    })

    if (inUse) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'This service is currently assigned to events and cannot be deleted',
      })
    }

    return prisma.serviceProviderService.update({
      where: { id: serviceId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })
  }

  // Category operations
  async listCategories(organizationId: string) {
    return prisma.serviceCategory.findMany({
      where: {
        organizationId,
        isDeleted: false
      },
      orderBy: { name: 'asc' },
    })
  }

  // Get serviceProviders by category
  async getServiceProvidersByCategory(organizationId: string, categoryId: string) {
    return prisma.serviceProvider.findMany({
      where: {
        organizationId,
        isDeleted: false,
        services: {
          some: {
            categoryId,
            isDeleted: false,
          },
        },
      },
      include: {
        services: {
          where: {
            categoryId,
            isDeleted: false,
          },
          include: {
            category: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })
  }
}

export const serviceProviderService = new ServiceProviderService()