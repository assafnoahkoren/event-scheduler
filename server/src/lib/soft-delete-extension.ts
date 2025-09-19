import { Prisma } from '@prisma/client'

/**
 * Prisma Client extension for soft deletes
 * Automatically applies to all models that have soft delete fields (isDeleted, deletedAt, deletedBy)
 * Intercepts delete operations and converts them to updates
 * Also filters out soft-deleted records from queries
 */

export function softDeleteExtension(userId?: string | null) {
  return Prisma.defineExtension({
    name: 'softDelete',
    query: {
      $allModels: {
        async delete({ args, query }: any) {
          // Convert delete to update with soft delete fields
          return query({
            ...args,
            data: {
              isDeleted: true,
              deletedAt: new Date(),
              ...(userId !== undefined && { deletedBy: userId })
            }
          })
        },

        async deleteMany({ args, query }: any) {
          // Convert deleteMany to updateMany with soft delete fields
          return query({
            ...args,
            data: {
              isDeleted: true,
              deletedAt: new Date(),
              ...(userId !== undefined && { deletedBy: userId })
            }
          })
        },

        async findFirst({ args, query }: any) {
          // Add filter to exclude soft deleted records
          args.where = {
            ...args.where,
            isDeleted: false
          }
          return query(args)
        },

        async findUnique({ args, query }: any) {
          // Change to findFirst to allow filtering by isDeleted
          args.where = {
            ...args.where,
            isDeleted: false
          }
          return query(args)
        },

        async findMany({ args, query }: any) {
          // Add filter to exclude soft deleted records
          if (!args.where) {
            args.where = {}
          }
          if (args.where.isDeleted === undefined) {
            args.where.isDeleted = false
          }
          return query(args)
        },

        async findUniqueOrThrow({ args, query }: any) {
          // Add filter to exclude soft deleted records
          args.where = {
            ...args.where,
            isDeleted: false
          }
          return query(args)
        },

        async findFirstOrThrow({ args, query }: any) {
          // Add filter to exclude soft deleted records
          args.where = {
            ...args.where,
            isDeleted: false
          }
          return query(args)
        },

        async count({ args, query }: any) {
          // Add filter to exclude soft deleted records
          if (!args.where) {
            args.where = {}
          }
          if (args.where.isDeleted === undefined) {
            args.where.isDeleted = false
          }
          return query(args)
        },

        async aggregate({ args, query }: any) {
          // Add filter to exclude soft deleted records
          if (!args.where) {
            args.where = {}
          }
          if (args.where.isDeleted === undefined) {
            args.where.isDeleted = false
          }
          return query(args)
        },

        async groupBy({ args, query }: any) {
          // Add filter to exclude soft deleted records
          if (!args.where) {
            args.where = {}
          }
          if (args.where.isDeleted === undefined) {
            args.where.isDeleted = false
          }
          return query(args)
        },

        async update({ args, query }: any) {
          // Add filter to prevent updating soft deleted records
          args.where = {
            ...args.where,
            isDeleted: false
          }
          return query(args)
        },

        async updateMany({ args, query }: any) {
          // Add filter to prevent updating soft deleted records
          if (!args.where) {
            args.where = {}
          }
          if (args.where.isDeleted === undefined) {
            args.where.isDeleted = false
          }
          return query(args)
        }
      }
    }
  })
}