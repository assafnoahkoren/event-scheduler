import { z } from 'zod'
import { prisma } from '../db'
import { EventStatus } from '@prisma/client'
import { TRPCError } from '@trpc/server'

// Schemas
export const createEventSchema = z.object({
  siteId: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  clientId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().default('UTC'),
  isAllDay: z.boolean().default(false),
  status: z.nativeEnum(EventStatus).default('SCHEDULED'),
})

export const updateEventSchema = createEventSchema.partial().extend({
  id: z.string().uuid(),
})

export const getEventsSchema = z.object({
  siteId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  clientId: z.string().uuid().optional(),
  status: z.nativeEnum(EventStatus).optional(),
})

// Types
export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type GetEventsInput = z.infer<typeof getEventsSchema>

// Service class
export class EventService {
  async createEvent(userId: string, input: CreateEventInput) {
    // Check if user has permission to create events in this site
    const siteUser = await prisma.siteUser.findFirst({
      where: {
        userId,
        siteId: input.siteId,
        role: {
          in: ['OWNER', 'ADMIN', 'EDITOR']
        }
      }
    })

    if (!siteUser) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to create events in this site'
      })
    }

    // Validate client belongs to the same site if provided
    if (input.clientId) {
      const client = await prisma.client.findFirst({
        where: {
          id: input.clientId,
          siteId: input.siteId
        }
      })

      if (!client) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Client not found or does not belong to this site'
        })
      }
    }

    return prisma.event.create({
      data: {
        ...input,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        createdBy: userId,
      },
      include: {
        client: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    })
  }

  async getEvents(userId: string, input: GetEventsInput) {
    // Check if user has permission to view events in this site
    const siteUser = await prisma.siteUser.findFirst({
      where: {
        userId,
        siteId: input.siteId,
      }
    })

    if (!siteUser) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view events in this site'
      })
    }

    const where: any = {
      siteId: input.siteId,
    }

    if (input.startDate) {
      where.startDate = { gte: new Date(input.startDate) }
    }

    if (input.endDate) {
      where.endDate = { lte: new Date(input.endDate) }
    }

    if (input.clientId) {
      where.clientId = input.clientId
    }

    if (input.status) {
      where.status = input.status
    }

    return prisma.event.findMany({
      where,
      include: {
        client: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    })
  }

  async getEvent(userId: string, eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        site: true,
        client: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    })

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found'
      })
    }

    // Check if user has permission to view this event
    const siteUser = await prisma.siteUser.findFirst({
      where: {
        userId,
        siteId: event.siteId,
      }
    })

    if (!siteUser) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this event'
      })
    }

    return event
  }

  async updateEvent(userId: string, input: UpdateEventInput) {
    const { id, ...data } = input

    // Check event exists and user has permission
    const event = await prisma.event.findUnique({
      where: { id }
    })

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found'
      })
    }

    const siteUser = await prisma.siteUser.findFirst({
      where: {
        userId,
        siteId: event.siteId,
        role: {
          in: ['OWNER', 'ADMIN', 'EDITOR']
        }
      }
    })

    if (!siteUser) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to update this event'
      })
    }

    // Validate client if changed
    if (data.clientId && data.clientId !== event.clientId) {
      const client = await prisma.client.findFirst({
        where: {
          id: data.clientId,
          siteId: event.siteId
        }
      })

      if (!client) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Client not found or does not belong to this site'
        })
      }
    }

    const updateData: any = { ...data }
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate)
    }
    if (data.endDate) {
      updateData.endDate = new Date(data.endDate)
    }

    return prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    })
  }

  async deleteEvent(userId: string, eventId: string) {
    // Check event exists and user has permission
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found'
      })
    }

    const siteUser = await prisma.siteUser.findFirst({
      where: {
        userId,
        siteId: event.siteId,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      }
    })

    if (!siteUser && event.createdBy !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this event'
      })
    }

    await prisma.event.delete({
      where: { id: eventId }
    })

    return { success: true }
  }
}

export const eventService = new EventService()