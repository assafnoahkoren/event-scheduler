import { z } from 'zod'
import { prisma } from '../db'
import { TRPCError } from '@trpc/server'

// Schemas
export const createPaymentSchema = z.object({
  eventId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  description: z.string().optional(),
})

export const updatePaymentSchema = createPaymentSchema.partial().extend({
  id: z.string().uuid(),
})

export const getPaymentsSchema = z.object({
  eventId: z.string().uuid(),
})

// Types
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>
export type GetPaymentsInput = z.infer<typeof getPaymentsSchema>

// Service class
export class PaymentService {
  /**
   * Verifies that a user has access to a payment through event/site membership.
   * Throws TRPCError if payment not found or user doesn't have access.
   * @returns The payment with event and site information
   */
  async verifyPaymentAccess(userId: string, paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        event: {
          include: {
            site: true,
          }
        }
      }
    })

    if (!payment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Payment not found'
      })
    }

    // Check if user has permission to access this payment through site membership
    const siteUser = await prisma.siteUser.findFirst({
      where: {
        userId,
        siteId: payment.event.siteId,
      }
    })

    if (!siteUser) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this payment'
      })
    }

    return payment
  }

  async createPayment(userId: string, input: CreatePaymentInput) {
    // Check if event exists and user has permission
    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      include: {
        site: true,
      }
    })

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found'
      })
    }

    // Check if user has permission to add payments to this event
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
        message: 'You do not have permission to add payments to this event'
      })
    }

    const payment = await prisma.payment.create({
      data: {
        eventId: input.eventId,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        recordedBy: userId,
      },
      include: {
        recorder: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    })

    return payment
  }

  async getPayments(userId: string, input: GetPaymentsInput) {
    // Check if event exists and user has permission
    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      include: {
        site: true,
      }
    })

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found'
      })
    }

    // Check if user has permission to view payments for this event
    const siteUser = await prisma.siteUser.findFirst({
      where: {
        userId,
        siteId: event.siteId,
      }
    })

    if (!siteUser) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view payments for this event'
      })
    }

    return prisma.payment.findMany({
      where: {
        eventId: input.eventId,
      },
      include: {
        recorder: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  async updatePayment(userId: string, input: UpdatePaymentInput) {
    const { id, ...data } = input

    // Check payment exists and user has permission
    const payment = await this.verifyPaymentAccess(userId, id)

    const siteUser = await prisma.siteUser.findFirst({
      where: {
        userId,
        siteId: payment.event.siteId,
        role: {
          in: ['OWNER', 'ADMIN', 'EDITOR']
        }
      }
    })

    if (!siteUser) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to update this payment'
      })
    }

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data,
      include: {
        recorder: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    })

    return updatedPayment
  }

  async deletePayment(userId: string, paymentId: string) {
    // Check payment exists and user has permission
    const payment = await this.verifyPaymentAccess(userId, paymentId)

    const siteUser = await prisma.siteUser.findFirst({
      where: {
        userId,
        siteId: payment.event.siteId,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      }
    })

    if (!siteUser && payment.recordedBy !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this payment'
      })
    }

    await prisma.payment.delete({
      where: { id: paymentId }
    })

    return { success: true }
  }

  async calculateEventPaymentSummary(userId: string, eventId: string) {
    // Check event exists and user has permission
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        site: true,
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
        siteId: event.siteId,
      }
    })

    if (!siteUser) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this event'
      })
    }

    // Get all payments for this event
    const payments = await prisma.payment.findMany({
      where: {
        eventId,
      }
    })

    // Calculate totals by currency
    const totalsByCurrency: Record<string, number> = {}

    for (const payment of payments) {
      const currency = payment.currency
      if (!totalsByCurrency[currency]) {
        totalsByCurrency[currency] = 0
      }
      totalsByCurrency[currency] += Number(payment.amount)
    }

    // Convert to array format
    const totals = Object.entries(totalsByCurrency).map(([currency, total]) => ({
      currency,
      total,
    }))

    return {
      payments: payments.length,
      totals,
    }
  }
}

export const paymentService = new PaymentService()
