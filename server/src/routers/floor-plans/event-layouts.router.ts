import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'
import { checkSiteAccess, canEdit, isAdminOrOwner } from '../../lib/access'

// ==================== Schemas ====================

const layoutDataSchema = z.object({
  floorPlanId: z.string().uuid(),
  name: z.string().optional(),
})

const updateLayoutSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable().optional(),
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

async function getEventWithSiteAccess(userId: string, eventId: string) {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      isDeleted: false,
    },
  })

  if (!event) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Event not found',
    })
  }

  const { role } = await checkSiteAccess(userId, event.siteId)
  return { event, role }
}

async function getLayoutWithSiteAccess(userId: string, layoutId: string) {
  const layout = await prisma.eventFloorPlanLayout.findFirst({
    where: {
      id: layoutId,
      isDeleted: false,
    },
    include: {
      event: true,
    },
  })

  if (!layout) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Layout not found',
    })
  }

  const { role } = await checkSiteAccess(userId, layout.event.siteId)
  return { layout, role }
}

// ==================== Router ====================

export const eventLayoutsRouter = router({
  // List all layouts for an event
  list: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getEventWithSiteAccess(ctx.user.id, input.eventId)

      const layouts = await prisma.eventFloorPlanLayout.findMany({
        where: {
          eventId: input.eventId,
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

      return layouts
    }),

  // Get a single layout by ID
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getLayoutWithSiteAccess(ctx.user.id, input.id)

      const layout = await prisma.eventFloorPlanLayout.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
        include: {
          event: true,
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

      return layout
    }),

  // Create a new layout for an event (or get existing one for that floor plan)
  create: protectedProcedure
    .input(layoutDataSchema.extend({ eventId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { role } = await getEventWithSiteAccess(ctx.user.id, input.eventId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create layouts',
        })
      }

      // Check if floor plan exists
      const floorPlan = await prisma.siteFloorPlan.findFirst({
        where: {
          id: input.floorPlanId,
          isDeleted: false,
        },
      })

      if (!floorPlan) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Floor plan not found',
        })
      }

      // Check if layout already exists for this event + floor plan
      const existingLayout = await prisma.eventFloorPlanLayout.findFirst({
        where: {
          eventId: input.eventId,
          floorPlanId: input.floorPlanId,
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

      if (existingLayout) {
        return existingLayout
      }

      const layout = await prisma.eventFloorPlanLayout.create({
        data: input,
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

      return layout
    }),

  // Create layout from a template (copies all components)
  createFromTemplate: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      templateId: z.string().uuid(),
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { role } = await getEventWithSiteAccess(ctx.user.id, input.eventId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create layouts',
        })
      }

      // Get the template with its components
      const template = await prisma.floorPlanTemplate.findFirst({
        where: {
          id: input.templateId,
          isDeleted: false,
        },
        include: {
          floorPlan: true,
          components: {
            where: { isDeleted: false },
          },
        },
      })

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        })
      }

      // Check if layout already exists for this event + floor plan
      const existingLayout = await prisma.eventFloorPlanLayout.findFirst({
        where: {
          eventId: input.eventId,
          floorPlanId: template.floorPlanId,
          isDeleted: false,
        },
      })

      if (existingLayout) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A layout already exists for this event and floor plan',
        })
      }

      // Create the layout and copy components in a transaction
      const layout = await prisma.$transaction(async (tx) => {
        const newLayout = await tx.eventFloorPlanLayout.create({
          data: {
            eventId: input.eventId,
            floorPlanId: template.floorPlanId,
            name: input.name ?? template.name,
          },
        })

        // Copy all components from the template
        if (template.components.length > 0) {
          await tx.eventLayoutComponent.createMany({
            data: template.components.map((component) => ({
              layoutId: newLayout.id,
              componentTypeId: component.componentTypeId,
              xInMeters: component.xInMeters,
              yInMeters: component.yInMeters,
              widthInMeters: component.widthInMeters,
              heightInMeters: component.heightInMeters,
              rotation: component.rotation,
              label: component.label,
            })),
          })
        }

        return newLayout
      })

      // Return the full layout with components
      const fullLayout = await prisma.eventFloorPlanLayout.findFirst({
        where: { id: layout.id },
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

      return fullLayout
    }),

  // Update a layout
  update: protectedProcedure
    .input(updateLayoutSchema)
    .mutation(async ({ ctx, input }) => {
      const { role } = await getLayoutWithSiteAccess(ctx.user.id, input.id)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update layouts',
        })
      }

      const { id, ...updateData } = input

      const layout = await prisma.eventFloorPlanLayout.update({
        where: { id },
        data: updateData,
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

      return layout
    }),

  // Delete a layout (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { role } = await getLayoutWithSiteAccess(ctx.user.id, input.id)

      if (!isAdminOrOwner(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins and owners can delete layouts',
        })
      }

      // Soft delete the layout and its components
      await prisma.$transaction([
        prisma.eventLayoutComponent.updateMany({
          where: {
            layoutId: input.id,
          },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        }),
        prisma.eventFloorPlanLayout.update({
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

  // Add a component to a layout
  addComponent: protectedProcedure
    .input(componentDataSchema.extend({ layoutId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { role } = await getLayoutWithSiteAccess(ctx.user.id, input.layoutId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to add components',
        })
      }

      const component = await prisma.eventLayoutComponent.create({
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
      const existingComponent = await prisma.eventLayoutComponent.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
        include: {
          layout: {
            include: {
              event: true,
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

      const { role } = await checkSiteAccess(ctx.user.id, existingComponent.layout.event.siteId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update components',
        })
      }

      const { id, ...updateData } = input

      const component = await prisma.eventLayoutComponent.update({
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
      const existingComponent = await prisma.eventLayoutComponent.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
        include: {
          layout: {
            include: {
              event: true,
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

      const { role } = await checkSiteAccess(ctx.user.id, existingComponent.layout.event.siteId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete components',
        })
      }

      await prisma.eventLayoutComponent.update({
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
      layoutId: z.string().uuid(),
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
      const { role } = await getLayoutWithSiteAccess(ctx.user.id, input.layoutId)

      if (!canEdit(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update components',
        })
      }

      await prisma.$transaction(
        input.components.map(({ id, ...updateData }) =>
          prisma.eventLayoutComponent.update({
            where: { id },
            data: updateData,
          })
        )
      )

      return { success: true }
    }),
})
