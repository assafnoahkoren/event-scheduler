import { z } from 'zod'
import { prisma } from '../db'
import { TRPCError } from '@trpc/server'

// Schemas
export const activityTypeArray = [
  'CREATE',
  'EDIT',
  'DELETE',
  'ACCESS',
  'INVITE',
  'ACCEPT',
  'REJECT',
  'UPLOAD',
  'DOWNLOAD',
  'SHARE',
] as const
export type ActivityType = typeof activityTypeArray[number]
export const activityTypeSchema = z.enum(activityTypeArray)

export const activityMessageArray = [
  'EVENT_CREATED',
] as const
export type ActivityMessage = typeof activityMessageArray[number]
export const activityMessageSchema = z.enum(activityMessageArray)

export const activityDomainArray = [
  'EVENTS',
  'PRODUCTS',
  'CLIENTS',
  'SERVICE_PROVIDERS',
  'ORGANIZATIONS',
  'SITES',
  'FILES',
  'AUTH',
] as const
export type ActivityDomain = typeof activityDomainArray[number]
export const activityDomainSchema = z.enum(activityDomainArray)

export const newActivitySchema = z.object({
  organizationId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  activityType: activityTypeSchema,
  activityDomain: activityDomainSchema.optional(),
  messageType: activityMessageSchema,
  data: z.any().optional(), // JSON data with message parameters
  objectType: z.string().min(1).max(100),
  objectId: z.string().uuid(),
})

export const getObjectActivitySchema = z.object({
  objectType: z.string().min(1).max(100),
  objectId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export const getUserActivitySchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export const getEventActivitySchema = z.object({
  eventId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export const getOrganizationActivitySchema = z.object({
  organizationId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export const getUnviewedCountSchema = z.object({
  organizationId: z.string().uuid(),
})

// Types
export type NewActivityInput = z.infer<typeof newActivitySchema>
export type GetObjectActivityInput = z.infer<typeof getObjectActivitySchema>
export type GetUserActivityInput = z.infer<typeof getUserActivitySchema>
export type GetEventActivityInput = z.infer<typeof getEventActivitySchema>
export type GetOrganizationActivityInput = z.infer<typeof getOrganizationActivitySchema>
export type GetUnviewedCountInput = z.infer<typeof getUnviewedCountSchema>

// Service class
export class UserActivityService {
  /**
   * Create a new activity log entry
   * Automatically creates a UserActivityView for the user who performed the action
   */
  async newActivity(userId: string, input: NewActivityInput) {
    // Verify user has access to the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: input.organizationId,
      },
    })

    const isOwner = await prisma.organization.findFirst({
      where: {
        id: input.organizationId,
        ownerId: userId,
      },
    })

    if (!orgMember && !isOwner) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to create activities in this organization',
      })
    }

    // If eventId is provided, verify it belongs to the organization
    if (input.eventId) {
      const event = await prisma.event.findFirst({
        where: {
          id: input.eventId,
        },
        include: {
          site: {
            select: {
              organizationId: true,
            },
          },
        },
      })

      if (!event || event.site.organizationId !== input.organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Event not found or does not belong to this organization',
        })
      }
    }

    // Create activity and view in a transaction
    const activity = await prisma.$transaction(async (tx) => {
      const newActivity = await tx.userActivity.create({
        data: {
          userId,
          organizationId: input.organizationId,
          eventId: input.eventId,
          activityType: input.activityType,
          activityDomain: input.activityDomain as any,
          messageType: input.messageType as any, // ActivityMessage enum
          data: input.data,
          objectType: input.objectType,
          objectId: input.objectId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      })

      // Create a view record for the user who created the activity (skip in development)
      if (process.env.NODE_ENV !== 'development') {
        await tx.userActivityView.create({
          data: {
            activityId: newActivity.id,
            userId,
          },
        })
      }

      return newActivity
    })

    return activity
  }

  /**
   * Get activities for a specific object (polymorphic query)
   */
  async getObjectActivity(userId: string, input: GetObjectActivityInput) {
    const activities = await prisma.userActivity.findMany({
      where: {
        objectType: input.objectType,
        objectId: input.objectId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        views: {
          where: {
            userId,
          },
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: input.offset,
      take: input.limit,
    })

    const total = await prisma.userActivity.count({
      where: {
        objectType: input.objectType,
        objectId: input.objectId,
      },
    })

    return {
      activities,
      total,
      hasMore: input.offset + input.limit < total,
    }
  }

  /**
   * Get activities performed by a specific user
   */
  async getUserActivity(requestingUserId: string, input: GetUserActivityInput) {
    // If organizationId is provided, verify the requesting user has access
    if (input.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          userId: requestingUserId,
          organizationId: input.organizationId,
        },
      })

      const isOwner = await prisma.organization.findFirst({
        where: {
          id: input.organizationId,
          ownerId: requestingUserId,
        },
      })

      if (!orgMember && !isOwner) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view activities in this organization',
        })
      }
    }

    const where: any = {
      userId: input.userId,
    }

    if (input.organizationId) {
      where.organizationId = input.organizationId
    }

    const activities = await prisma.userActivity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        views: {
          where: {
            userId: requestingUserId,
          },
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: input.offset,
      take: input.limit,
    })

    const total = await prisma.userActivity.count({
      where,
    })

    return {
      activities,
      total,
      hasMore: input.offset + input.limit < total,
    }
  }

  /**
   * Get activities for a specific event
   */
  async getEventActivity(userId: string, input: GetEventActivityInput) {
    // Verify user has access to the event
    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      include: {
        site: true,
      },
    })

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found',
      })
    }

    // Check if user has access to the site
    const siteUser = await prisma.siteUser.findFirst({
      where: {
        userId,
        siteId: event.siteId,
      },
    })

    if (!siteUser) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this event',
      })
    }

    const activities = await prisma.userActivity.findMany({
      where: {
        eventId: input.eventId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        views: {
          where: {
            userId,
          },
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: input.offset,
      take: input.limit,
    })

    const total = await prisma.userActivity.count({
      where: {
        eventId: input.eventId,
      },
    })

    return {
      activities,
      total,
      hasMore: input.offset + input.limit < total,
    }
  }

  /**
   * Get activities for a specific organization
   */
  async getOrganizationActivity(userId: string, input: GetOrganizationActivityInput) {
    // Verify user has access to the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: input.organizationId,
      },
    })

    const isOwner = await prisma.organization.findFirst({
      where: {
        id: input.organizationId,
        ownerId: userId,
      },
    })

    if (!orgMember && !isOwner) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view activities in this organization',
      })
    }

    const activities = await prisma.userActivity.findMany({
      where: {
        organizationId: input.organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        views: {
          where: {
            userId,
          },
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: input.offset,
      take: input.limit,
    })

    const total = await prisma.userActivity.count({
      where: {
        organizationId: input.organizationId,
      },
    })

    return {
      activities,
      total,
      hasMore: input.offset + input.limit < total,
    }
  }

  /**
   * Mark an activity as viewed by a user
   */
  async markActivityViewed(userId: string, activityId: string) {
    // Verify activity exists and user has access
    const activity = await prisma.userActivity.findUnique({
      where: { id: activityId },
      include: {
        organization: true,
      },
    })

    if (!activity) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Activity not found',
      })
    }

    // Verify user has access to the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: activity.organizationId,
      },
    })

    const isOwner = activity.organization.ownerId === userId

    if (!orgMember && !isOwner) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this activity',
      })
    }

    // Create or update view record (upsert)
    const view = await prisma.userActivityView.upsert({
      where: {
        activityId_userId: {
          activityId,
          userId,
        },
      },
      update: {
        updatedAt: new Date(),
      },
      create: {
        activityId,
        userId,
      },
    })

    return view
  }

  /**
   * Get count of unviewed notifications for a user in an organization
   * Checks the last 100 notifications
   */
  async getUnviewedCount(userId: string, input: GetUnviewedCountInput) {
    // Verify user has access to the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: input.organizationId,
      },
    })

    const isOwner = await prisma.organization.findFirst({
      where: {
        id: input.organizationId,
        ownerId: userId,
      },
    })

    if (!orgMember && !isOwner) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view activities in this organization',
      })
    }

    // Count unviewed activities in the last 100 notifications
    const unviewedActivities = await prisma.userActivity.findMany({
      where: {
        organizationId: input.organizationId,
        views: {
          none: {
            userId,
          },
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    })

    return { count: unviewedActivities.length }
  }
}

export const userActivityService = new UserActivityService()
