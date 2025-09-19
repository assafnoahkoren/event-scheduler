import { z } from 'zod'
import { prisma } from '../db'
import { TRPCError } from '@trpc/server'

// Schemas
export const searchClientsSchema = z.object({
  siteId: z.string().uuid(),
  query: z.string().optional(),
  limit: z.number().min(1).max(50).default(10)
})

export const createClientSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional()
})

export const updateClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional()
})

// Type exports
export type SearchClientsInput = z.infer<typeof searchClientsSchema>
export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>

class ClientService {
  async searchClients(userId: string, input: SearchClientsInput) {
    const { siteId, query, limit } = input

    // Verify user has access to the site
    const siteUser = await prisma.siteUser.findFirst({
      where: {
        userId,
        siteId,
        isActive: true
      }
    })

    if (!siteUser) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied to this site'
      })
    }

    // Search clients
    const where: any = {
      siteId,
      isActive: true
    }

    if (query && query.length > 0) {
      where.name = {
        contains: query,
        mode: 'insensitive'
      }
    }

    const clients = await prisma.client.findMany({
      where,
      take: limit,
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    })

    return clients
  }

  async getClient(userId: string, clientId: string) {
    const client = await prisma.client.findFirst({
      where: {
        id: clientId
      },
      include: {
        site: {
          include: {
            siteUsers: {
              where: {
                userId,
                isActive: true
              }
            }
          }
        }
      }
    })

    if (!client) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Client not found'
      })
    }

    if (client.site.siteUsers.length === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied to this client'
      })
    }

    return client
  }

  async createClient(userId: string, input: CreateClientInput) {
    const { siteId, ...clientData } = input

    // Verify user has access to the site
    const siteUser = await prisma.siteUser.findFirst({
      where: {
        userId,
        siteId,
        isActive: true
      }
    })

    if (!siteUser) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied to this site'
      })
    }

    // Check if client with same name already exists
    const existingClient = await prisma.client.findFirst({
      where: {
        siteId,
        name: clientData.name,
        isActive: true
      }
    })

    if (existingClient) {
      return existingClient
    }

    // Create the client
    const client = await prisma.client.create({
      data: {
        ...clientData,
        siteId,
        createdBy: userId
      }
    })

    return client
  }

  async updateClient(userId: string, input: UpdateClientInput) {
    const { id, ...updateData } = input

    // Verify user has access to the client
    const client = await prisma.client.findFirst({
      where: {
        id
      },
      include: {
        site: {
          include: {
            siteUsers: {
              where: {
                userId,
                isActive: true
              }
            }
          }
        }
      }
    })

    if (!client) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Client not found'
      })
    }

    if (client.site.siteUsers.length === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied to this client'
      })
    }

    // Update the client
    const updatedClient = await prisma.client.update({
      where: { id },
      data: updateData
    })

    return updatedClient
  }

  async deleteClient(userId: string, clientId: string) {
    // Verify user has access to the client
    const client = await prisma.client.findFirst({
      where: {
        id: clientId
      },
      include: {
        site: {
          include: {
            siteUsers: {
              where: {
                userId,
                isActive: true,
                role: {
                  in: ['OWNER', 'ADMIN']
                }
              }
            }
          }
        }
      }
    })

    if (!client) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Client not found'
      })
    }

    if (client.site.siteUsers.length === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only site owners and admins can delete clients'
      })
    }

    // Soft delete the client
    await prisma.client.delete({
      where: { id: clientId }
    })

    return { success: true }
  }
}

export const clientService = new ClientService()