import { z } from 'zod'
import { prisma } from '../db'
import { TRPCError } from '@trpc/server'

// EventProvider schemas
export const addEventProviderSchema = z.object({
  eventId: z.string().uuid(),
  providerId: z.string().uuid(),
  providerServiceId: z.string().uuid(),
  price: z.number().min(0).optional(),
  providerPrice: z.number().min(0).optional(),
  notes: z.string().optional(),
})

export const updateEventProviderSchema = z.object({
  id: z.string().uuid(),
  price: z.number().min(0).optional(),
  providerPrice: z.number().min(0).optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
  isPaid: z.boolean().optional(),
  paymentNotes: z.string().optional(),
})

export const removeEventProviderSchema = z.object({
  id: z.string().uuid(),
})

export const listEventProvidersSchema = z.object({
  eventId: z.string().uuid(),
})

// Type exports
export type AddEventProviderInput = z.infer<typeof addEventProviderSchema>
export type UpdateEventProviderInput = z.infer<typeof updateEventProviderSchema>
export type RemoveEventProviderInput = z.infer<typeof removeEventProviderSchema>
export type ListEventProvidersInput = z.infer<typeof listEventProvidersSchema>

class EventProviderService {
  // List providers for an event
  async listEventProviders(input: ListEventProvidersInput) {
    return prisma.eventProvider.findMany({
      where: {
        eventId: input.eventId,
        isDeleted: false,
      },
      include: {
        provider: true,
        providerService: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  // Add provider to event
  async addEventProvider(input: AddEventProviderInput) {
    // Verify event exists
    const event = await prisma.event.findFirst({
      where: { id: input.eventId, isDeleted: false },
    })

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found',
      })
    }

    // Verify provider service exists and belongs to the provider
    const providerService = await prisma.serviceProviderService.findFirst({
      where: {
        id: input.providerServiceId,
        providerId: input.providerId,
        isDeleted: false,
      },
      include: {
        provider: true,
        category: true,
      },
    })

    if (!providerService) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Provider service not found or does not belong to the specified provider',
      })
    }

    // Allow multiple instances of the same service to be added to an event
    // This is useful when you need multiple providers of the same type (e.g., multiple photographers)

    return prisma.eventProvider.create({
      data: {
        eventId: input.eventId,
        providerId: input.providerId,
        providerServiceId: input.providerServiceId,
        agreedPrice: input.price ?? providerService.price,
        providerPrice: input.providerPrice ?? 0,
        currency: providerService.currency,
        notes: input.notes,
      },
      include: {
        provider: true,
        providerService: {
          include: {
            category: true,
          },
        },
      },
    })
  }

  // Update event provider
  async updateEventProvider(input: UpdateEventProviderInput) {
    const eventProvider = await prisma.eventProvider.findFirst({
      where: { id: input.id, isDeleted: false },
    })

    if (!eventProvider) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event provider assignment not found',
      })
    }

    const updateData: any = {}
    if (input.price !== undefined) updateData.agreedPrice = input.price
    if (input.providerPrice !== undefined) updateData.providerPrice = input.providerPrice
    if (input.notes !== undefined) updateData.notes = input.notes
    if (input.status !== undefined) updateData.status = input.status
    if (input.paymentNotes !== undefined) updateData.paymentNotes = input.paymentNotes

    // If marking as paid, set the paidAt timestamp
    if (input.isPaid === true && !eventProvider.isPaid) {
      updateData.paidAt = new Date()
      updateData.isPaid = true
    } else if (input.isPaid === false) {
      updateData.paidAt = null
      updateData.isPaid = false
    }

    return prisma.eventProvider.update({
      where: { id: input.id },
      data: updateData,
      include: {
        provider: true,
        providerService: {
          include: {
            category: true,
          },
        },
      },
    })
  }

  // Remove provider from event
  async removeEventProvider(input: RemoveEventProviderInput) {
    const eventProvider = await prisma.eventProvider.findFirst({
      where: { id: input.id, isDeleted: false },
    })

    if (!eventProvider) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event provider assignment not found',
      })
    }

    // Soft delete handled by the Prisma extension
    return prisma.eventProvider.delete({
      where: { id: input.id },
    })
  }

  // Get provider availability for a date range
  async getProviderAvailability(providerId: string, startDate: string, endDate: string) {
    const events = await prisma.eventProvider.findMany({
      where: {
        providerId,
        isDeleted: false,
        event: {
          isDeleted: false,
          OR: [
            {
              startDate: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            },
            {
              endDate: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            },
          ],
        },
      },
      include: {
        event: {
          include: {
            client: true,
          },
        },
        providerService: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        event: {
          startDate: 'asc',
        },
      },
    })

    return events
  }

  // Get payment summary for providers in an event
  async getEventProviderPaymentSummary(eventId: string) {
    const providers = await prisma.eventProvider.findMany({
      where: {
        eventId,
        isDeleted: false,
      },
      include: {
        provider: true,
        providerService: {
          include: {
            category: true,
          },
        },
      },
    })

    const summary = {
      totalAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      providers: providers.map(ec => ({
        ...ec,
        amount: ec.agreedPrice || 0,
      })),
    }

    providers.forEach(ec => {
      const amount = ec.agreedPrice || 0
      summary.totalAmount += amount
      if (ec.isPaid) {
        summary.paidAmount += amount
      } else {
        summary.unpaidAmount += amount
      }
    })

    return summary
  }
}

export const eventProviderService = new EventProviderService()