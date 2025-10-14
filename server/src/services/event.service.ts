import { z } from 'zod'
import { prisma } from '../db'
import { EventStatus } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { userActivityService } from './user-activity.service'

// Schemas
export const createEventSchema = z.object({
  siteId: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  clientId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().default('UTC'),
  isAllDay: z.boolean().default(false),
  status: z.nativeEnum(EventStatus).default('DRAFT'),
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
  private async logEventActivity(
    userId: string,
    organizationId: string,
    eventId: string,
    activityType: 'CREATE' | 'EDIT' | 'DELETE',
    eventTitle?: string,
    clientName?: string
  ) {
    const data = {
      title: eventTitle || 'Untitled Event',
      ...(clientName && { client: clientName }),
    }

    await userActivityService.newActivity(userId, {
      organizationId,
      eventId,
      activityType,
      activityDomain: 'EVENTS',
      messageType: 'EVENT_CREATED',
      data,
      objectType: 'Event',
      objectId: eventId,
    })
  }

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

    // Get the site's organizationId for activity logging
    const site = await prisma.site.findUnique({
      where: { id: input.siteId },
      select: { organizationId: true }
    })

    if (!site) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Site not found'
      })
    }

    // Validate client belongs to the same organization as the site if provided
    if (input.clientId) {
      const client = await prisma.client.findFirst({
        where: {
          id: input.clientId,
          organizationId: site.organizationId
        }
      })

      if (!client) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Client not found or does not belong to this organization'
        })
      }
    }

    const event = await prisma.event.create({
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
            firstName: true,
            lastName: true,
          }
        }
      }
    })

    // Log the activity
    await this.logEventActivity(
      userId,
      site.organizationId,
      event.id,
      'CREATE',
      input.title,
      event.client?.name
    )

    return event
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

    // Get events that start before the end of the range
    // and end after the start of the range (or have no end date)
    if (input.startDate && input.endDate) {
      where.startDate = { lte: new Date(input.endDate) }
      where.OR = [
        { endDate: { gte: new Date(input.startDate) } },
        { endDate: null }
      ]
    } else if (input.startDate) {
      where.OR = [
        { endDate: { gte: new Date(input.startDate) } },
        { endDate: null }
      ]
    } else if (input.endDate) {
      where.startDate = { lte: new Date(input.endDate) }
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
      // Get the site's organizationId
      const site = await prisma.site.findUnique({
        where: { id: event.siteId },
        select: { organizationId: true }
      })

      if (!site) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found'
        })
      }

      const client = await prisma.client.findFirst({
        where: {
          id: data.clientId,
          organizationId: site.organizationId
        }
      })

      if (!client) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Client not found or does not belong to this organization'
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

  async calculateProfitByDateRange(userId: string, siteId: string, startDate: string, endDate: string) {
    // Verify user has access to this site
    const siteUser = await prisma.siteUser.findFirst({
      where: {
        userId,
        siteId
      }
    })

    if (!siteUser) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this site'
      })
    }

    // Get all events in the date range
    // Add time to ensure we capture the full day in any timezone
    const startDateTime = new Date(startDate + 'T00:00:00')
    const endDateTime = new Date(endDate + 'T23:59:59')

    const events = await prisma.event.findMany({
      where: {
        siteId,
        startDate: {
          gte: startDateTime,
          lte: endDateTime
        },
        status: {
          not: 'CANCELLED'
        }
      },
      include: {
        providers: {
          include: {
            providerService: true
          }
        },
        products: {
          include: {
            product: true
          }
        }
      }
    })

    // Create a map of dates to profit
    const profitByDate: Record<string, number> = {}

    // Initialize all dates in range with 0 profit
    const currentDate = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')

    while (currentDate <= end) {
      // Format date as YYYY-MM-DD in local time
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      profitByDate[dateKey] = 0
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Calculate profit for each event
    for (const event of events) {
      // Format event date as YYYY-MM-DD in local time
      const eventDate = new Date(event.startDate)
      const year = eventDate.getFullYear()
      const month = String(eventDate.getMonth() + 1).padStart(2, '0')
      const day = String(eventDate.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`

      // Calculate client cost
      let clientCost = 0

      // Add service costs
      for (const provider of event.providers) {
        const servicePrice = provider.agreedPrice || provider.providerService.price || 0
        clientCost += servicePrice
      }

      // Add product costs
      for (const product of event.products) {
        const productPrice = product.price || product.product?.price || 0
        const quantity = product.quantity || 1
        clientCost += productPrice * quantity
      }

      // Calculate provider cost
      let providerCost = 0
      for (const provider of event.providers) {
        const providerPrice = provider.providerPrice || 0
        providerCost += providerPrice
      }

      // Add profit for this date
      const profit = clientCost - providerCost
      if (profitByDate[dateKey] !== undefined) {
        profitByDate[dateKey] += profit
      }
    }

    // Convert to array format for chart
    const profitData = Object.entries(profitByDate).map(([date, profit]) => ({
      date,
      profit,
      displayDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }))

    // Calculate total profit
    const totalProfit = profitData.reduce((sum, item) => sum + item.profit, 0)

    return {
      data: profitData,
      totalProfit,
      currency: 'ILS'
    }
  }

  async calculateEventCosts(userId: string, eventId: string) {
    // Check event exists and user has permission to view it
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        providers: {
          include: {
            provider: true,
            providerService: {
              include: {
                category: true
              }
            }
          }
        },
        products: {
          include: {
            product: true
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

    const siteUser = await prisma.siteUser.findFirst({
      where: {
        userId,
        siteId: event.siteId
      }
    })

    if (!siteUser) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this event'
      })
    }

    // Calculate total client cost (what client pays)
    let clientCost = 0

    // Add service costs (what we charge the client)
    for (const eventProvider of event.providers) {
      // Use agreed price if set, otherwise use service default price
      const servicePrice = eventProvider.agreedPrice || eventProvider.providerService.price || 0
      clientCost += servicePrice
    }

    // Add product costs
    for (const eventProduct of event.products) {
      const productPrice = eventProduct.price || eventProduct.product?.price || 0
      const quantity = eventProduct.quantity || 1
      clientCost += productPrice * quantity
    }

    // Calculate total provider cost (what we pay providers)
    let providerCost = 0

    for (const eventProvider of event.providers) {
      // Use provider price if set, otherwise default to 0
      const providerPrice = eventProvider.providerPrice || 0
      providerCost += providerPrice
    }

    // Calculate profit
    const profit = clientCost - providerCost

    return {
      clientCost,
      providerCost,
      profit,
      currency: 'ILS' // Default currency, could be made dynamic
    }
  }
}

export const eventService = new EventService()