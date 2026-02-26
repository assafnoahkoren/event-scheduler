import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'
import { checkSiteAccess, canEdit, isAdminOrOwner } from '../../lib/access'

const siteFloorPlanDataSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  imageFileId: z.string().uuid().optional(),
  pixelsPerMeter: z.number().positive().optional(),
  sortOrder: z.number().int().default(0),
})

const updateSiteFloorPlanSchema = siteFloorPlanDataSchema
  .partial()
  .extend({
    id: z.string().uuid(),
    imageFileId: z.string().uuid().nullable().optional(),
    pixelsPerMeter: z.number().positive().nullable().optional(),
  })

export const siteFloorPlansRouter = router({
  // List all floor plans for a site
  list: protectedProcedure
    .input(z.object({ siteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await checkSiteAccess(ctx.user.id, input.siteId)

      const floorPlans = await prisma.siteFloorPlan.findMany({
        where: {
          siteId: input.siteId,
          isDeleted: false,
        },
        include: {
          imageFile: true,
          templates: {
            where: { isDeleted: false },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      })

      return floorPlans
    }),

  // Get a single floor plan by ID
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const floorPlan = await prisma.siteFloorPlan.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
        include: {
          imageFile: true,
          templates: {
            where: { isDeleted: false },
            include: {
              components: {
                where: { isDeleted: false },
                include: {
                  componentType: true,
                },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

      if (!floorPlan) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Floor plan not found',
        })
      }

      await checkSiteAccess(ctx.user.id, floorPlan.siteId)

      return floorPlan
    }),

  // Create a new floor plan
  create: protectedProcedure
    .input(siteFloorPlanDataSchema.extend({ siteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { role } = await checkSiteAccess(ctx.user.id, input.siteId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create floor plans',
        })
      }

      const floorPlan = await prisma.siteFloorPlan.create({
        data: input,
        include: {
          imageFile: true,
        },
      })

      return floorPlan
    }),

  // Update a floor plan
  update: protectedProcedure
    .input(updateSiteFloorPlanSchema)
    .mutation(async ({ ctx, input }) => {
      const existingFloorPlan = await prisma.siteFloorPlan.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
      })

      if (!existingFloorPlan) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Floor plan not found',
        })
      }

      const { role } = await checkSiteAccess(ctx.user.id, existingFloorPlan.siteId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update floor plans',
        })
      }

      const { id, ...updateData } = input

      const floorPlan = await prisma.siteFloorPlan.update({
        where: { id },
        data: updateData,
        include: {
          imageFile: true,
        },
      })

      return floorPlan
    }),

  // Calibrate floor plan (set pixelsPerMeter)
  calibrate: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      pixelsPerMeter: z.number().positive('Pixels per meter must be positive'),
    }))
    .mutation(async ({ ctx, input }) => {
      const existingFloorPlan = await prisma.siteFloorPlan.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
      })

      if (!existingFloorPlan) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Floor plan not found',
        })
      }

      const { role } = await checkSiteAccess(ctx.user.id, existingFloorPlan.siteId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to calibrate floor plans',
        })
      }

      const floorPlan = await prisma.siteFloorPlan.update({
        where: { id: input.id },
        data: {
          pixelsPerMeter: input.pixelsPerMeter,
        },
        include: {
          imageFile: true,
        },
      })

      return floorPlan
    }),

  // Update sort orders for multiple floor plans
  updateSortOrders: protectedProcedure
    .input(z.object({
      siteId: z.string().uuid(),
      orders: z.array(z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { role } = await checkSiteAccess(ctx.user.id, input.siteId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to reorder floor plans',
        })
      }

      await prisma.$transaction(
        input.orders.map(({ id, sortOrder }) =>
          prisma.siteFloorPlan.update({
            where: { id },
            data: { sortOrder },
          })
        )
      )

      return { success: true }
    }),

  // Delete a floor plan (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existingFloorPlan = await prisma.siteFloorPlan.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
      })

      if (!existingFloorPlan) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Floor plan not found',
        })
      }

      const { role } = await checkSiteAccess(ctx.user.id, existingFloorPlan.siteId)

      if (!isAdminOrOwner(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins and owners can delete floor plans',
        })
      }

      // Check if floor plan is used in any events
      const eventLayoutsCount = await prisma.eventFloorPlanLayout.count({
        where: {
          floorPlanId: input.id,
          isDeleted: false,
        },
      })

      if (eventLayoutsCount > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Cannot delete floor plan that is used in events',
        })
      }

      // Soft delete the floor plan and its templates/components
      await prisma.$transaction([
        prisma.floorPlanTemplateComponent.updateMany({
          where: {
            template: {
              floorPlanId: input.id,
            },
          },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        }),
        prisma.floorPlanTemplate.updateMany({
          where: {
            floorPlanId: input.id,
          },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        }),
        prisma.siteFloorPlan.update({
          where: { id: input.id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        }),
      ])

      return { success: true }
    }),
})
