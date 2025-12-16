import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'
import { checkOrganizationAccess } from '../../lib/access'

const componentTypeDataSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  icon: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  defaultWidthInMeters: z.number().positive('Width must be positive'),
  defaultHeightInMeters: z.number().positive('Height must be positive'),
  occupancy: z.number().int().positive().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  borderRadius: z.number().min(0, 'Border radius must be non-negative').optional(),
})

const updateComponentTypeSchema = componentTypeDataSchema
  .partial()
  .extend({
    id: z.string().uuid(),
    icon: z.string().nullable().optional(),
    occupancy: z.number().int().positive().nullable().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').nullable().optional(),
    borderRadius: z.number().min(0, 'Border radius must be non-negative').nullable().optional(),
  })

export const componentTypesRouter = router({
  // List all component types for an organization
  list: protectedProcedure
    .input(z.object({
      organizationId: z.string().uuid(),
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      await checkOrganizationAccess(ctx.user.id, input.organizationId)

      const componentTypes = await prisma.componentType.findMany({
        where: {
          organizationId: input.organizationId,
          isDeleted: false,
          ...(input.category && { category: input.category }),
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' },
        ],
      })

      return componentTypes
    }),

  // Get a single component type by ID
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const componentType = await prisma.componentType.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
      })

      if (!componentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Component type not found',
        })
      }

      await checkOrganizationAccess(ctx.user.id, componentType.organizationId)

      return componentType
    }),

  // Get unique categories for an organization
  listCategories: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await checkOrganizationAccess(ctx.user.id, input.organizationId)

      const categories = await prisma.componentType.findMany({
        where: {
          organizationId: input.organizationId,
          isDeleted: false,
        },
        select: {
          category: true,
        },
        distinct: ['category'],
        orderBy: {
          category: 'asc',
        },
      })

      return categories.map(c => c.category)
    }),

  // Create a new component type
  create: protectedProcedure
    .input(componentTypeDataSchema.extend({ organizationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { isOwner } = await checkOrganizationAccess(ctx.user.id, input.organizationId)

      if (!isOwner) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only organization owners can create component types',
        })
      }

      const componentType = await prisma.componentType.create({
        data: input,
      })

      return componentType
    }),

  // Update a component type
  update: protectedProcedure
    .input(updateComponentTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const existingComponentType = await prisma.componentType.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
      })

      if (!existingComponentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Component type not found',
        })
      }

      const { isOwner } = await checkOrganizationAccess(ctx.user.id, existingComponentType.organizationId)

      if (!isOwner) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only organization owners can update component types',
        })
      }

      const { id, ...updateData } = input

      const componentType = await prisma.componentType.update({
        where: { id },
        data: updateData,
      })

      return componentType
    }),

  // Delete a component type (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existingComponentType = await prisma.componentType.findFirst({
        where: {
          id: input.id,
          isDeleted: false,
        },
      })

      if (!existingComponentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Component type not found',
        })
      }

      const { isOwner } = await checkOrganizationAccess(ctx.user.id, existingComponentType.organizationId)

      if (!isOwner) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only organization owners can delete component types',
        })
      }

      // Check if component type is in use
      const [templateComponentsCount, eventComponentsCount] = await Promise.all([
        prisma.floorPlanTemplateComponent.count({
          where: {
            componentTypeId: input.id,
            isDeleted: false,
          },
        }),
        prisma.eventLayoutComponent.count({
          where: {
            componentTypeId: input.id,
            isDeleted: false,
          },
        }),
      ])

      if (templateComponentsCount > 0 || eventComponentsCount > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Cannot delete component type that is in use',
        })
      }

      await prisma.componentType.update({
        where: { id: input.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      })

      return { success: true }
    }),
})
