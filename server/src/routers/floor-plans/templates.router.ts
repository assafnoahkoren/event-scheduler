import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'
import { checkSiteAccess, canEdit, isAdminOrOwner } from '../../lib/access'

// ==================== Schemas ====================

const templateDataSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sortOrder: z.number().int().default(0),
})

const updateTemplateSchema = templateDataSchema
  .partial()
  .extend({
    id: z.string().uuid(),
  })

const componentDataSchema = z.object({
  componentTypeId: z.string().uuid(),
  xInMeters: z.number(),
  yInMeters: z.number(),
  widthInMeters: z.number().positive(),
  heightInMeters: z.number().positive(),
  rotation: z.number().min(0).max(360).default(0),
  label: z.string().optional(),
})

const updateComponentSchema = componentDataSchema
  .partial()
  .extend({
    id: z.string().uuid(),
    label: z.string().nullable().optional(),
  })

// ==================== Helper Functions ====================

async function getFloorPlanWithSiteAccess(userId: string, floorPlanId: string) {
  const floorPlan = await prisma.siteFloorPlan.findFirst({
    where: {
      id: floorPlanId,
      isDeleted: false,
    },
  })

  if (!floorPlan) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Floor plan not found',
    })
  }

  const { role } = await checkSiteAccess(userId, floorPlan.siteId)
  return { floorPlan, role }
}

async function getTemplateWithSiteAccess(userId: string, templateId: string) {
  const template = await prisma.floorPlanTemplate.findFirst({
    where: {
      id: templateId,
      isDeleted: false,
    },
    include: {
      floorPlan: true,
    },
  })

  if (!template) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Template not found',
    })
  }

  const { role } = await checkSiteAccess(userId, template.floorPlan.siteId)
  return { template, role }
}

// ==================== Router ====================

export const templatesRouter = router({
  // List all templates for a floor plan
  list: protectedProcedure
    .input(z.object({ floorPlanId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getFloorPlanWithSiteAccess(ctx.user.id, input.floorPlanId)

      const templates = await prisma.floorPlanTemplate.findMany({
        where: {
          floorPlanId: input.floorPlanId,
          isDeleted: false,
        },
        include: {
          components: {
            where: { isDeleted: false },
            include: {
              componentType: true,
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      })

      return templates
    }),

  // Get a single template by ID
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getTemplateWithSiteAccess(ctx.user.id, input.id)

      const fullTemplate = await prisma.floorPlanTemplate.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
        include: {
          floorPlan: {
            include: {
              imageFile: true,
            },
          },
          components: {
            where: { isDeleted: false },
            include: {
              componentType: true,
            },
          },
        },
      })

      if (!fullTemplate) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        })
      }

      return fullTemplate
    }),

  // Create a new template
  create: protectedProcedure
    .input(templateDataSchema.extend({ floorPlanId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { role } = await getFloorPlanWithSiteAccess(ctx.user.id, input.floorPlanId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create templates',
        })
      }

      const template = await prisma.floorPlanTemplate.create({
        data: input,
        include: {
          components: {
            where: { isDeleted: false },
            include: {
              componentType: true,
            },
          },
        },
      })

      return template
    }),

  // Update a template
  update: protectedProcedure
    .input(updateTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const { role } = await getTemplateWithSiteAccess(ctx.user.id, input.id)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update templates',
        })
      }

      const { id, ...updateData } = input

      const template = await prisma.floorPlanTemplate.update({
        where: { id },
        data: updateData,
        include: {
          components: {
            where: { isDeleted: false },
            include: {
              componentType: true,
            },
          },
        },
      })

      return template
    }),

  // Update sort orders for multiple templates
  updateSortOrders: protectedProcedure
    .input(z.object({
      floorPlanId: z.string().uuid(),
      orders: z.array(z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { role } = await getFloorPlanWithSiteAccess(ctx.user.id, input.floorPlanId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to reorder templates',
        })
      }

      await prisma.$transaction(
        input.orders.map(({ id, sortOrder }) =>
          prisma.floorPlanTemplate.update({
            where: { id },
            data: { sortOrder },
          })
        )
      )

      return { success: true }
    }),

  // Delete a template (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { role } = await getTemplateWithSiteAccess(ctx.user.id, input.id)

      if (!isAdminOrOwner(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins and owners can delete templates',
        })
      }

      // Soft delete the template and its components
      await prisma.$transaction([
        prisma.floorPlanTemplateComponent.updateMany({
          where: {
            templateId: input.id,
          },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        }),
        prisma.floorPlanTemplate.update({
          where: { id: input.id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        }),
      ])

      return { success: true }
    }),

  // ==================== Component Operations ====================

  // Add a component to a template
  addComponent: protectedProcedure
    .input(componentDataSchema.extend({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { role } = await getTemplateWithSiteAccess(ctx.user.id, input.templateId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to add components',
        })
      }

      const component = await prisma.floorPlanTemplateComponent.create({
        data: input,
        include: {
          componentType: true,
        },
      })

      return component
    }),

  // Update a component
  updateComponent: protectedProcedure
    .input(updateComponentSchema)
    .mutation(async ({ ctx, input }) => {
      const existingComponent = await prisma.floorPlanTemplateComponent.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
        include: {
          template: {
            include: {
              floorPlan: true,
            },
          },
        },
      })

      if (!existingComponent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Component not found',
        })
      }

      const { role } = await checkSiteAccess(ctx.user.id, existingComponent.template.floorPlan.siteId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update components',
        })
      }

      const { id, ...updateData } = input

      const component = await prisma.floorPlanTemplateComponent.update({
        where: { id },
        data: updateData,
        include: {
          componentType: true,
        },
      })

      return component
    }),

  // Delete a component (soft delete)
  deleteComponent: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existingComponent = await prisma.floorPlanTemplateComponent.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
        include: {
          template: {
            include: {
              floorPlan: true,
            },
          },
        },
      })

      if (!existingComponent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Component not found',
        })
      }

      const { role } = await checkSiteAccess(ctx.user.id, existingComponent.template.floorPlan.siteId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete components',
        })
      }

      await prisma.floorPlanTemplateComponent.update({
        where: { id: input.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      })

      return { success: true }
    }),

  // Bulk update components (for drag & drop operations)
  bulkUpdateComponents: protectedProcedure
    .input(z.object({
      templateId: z.string().uuid(),
      components: z.array(z.object({
        id: z.string().uuid(),
        xInMeters: z.number().optional(),
        yInMeters: z.number().optional(),
        widthInMeters: z.number().positive().optional(),
        heightInMeters: z.number().positive().optional(),
        rotation: z.number().min(0).max(360).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { role } = await getTemplateWithSiteAccess(ctx.user.id, input.templateId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update components',
        })
      }

      await prisma.$transaction(
        input.components.map(({ id, ...updateData }) =>
          prisma.floorPlanTemplateComponent.update({
            where: { id },
            data: updateData,
          })
        )
      )

      return { success: true }
    }),
})
