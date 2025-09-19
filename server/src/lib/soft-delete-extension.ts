import { Prisma } from '@prisma/client'

/**
 * Prisma Client extension for soft deletes
 * Automatically applies to all models that have soft delete fields (isDeleted, deletedAt)
 * Intercepts delete operations and converts them to updates
 * Also filters out soft-deleted records from queries
 */

export function softDeleteExtension() {
  return Prisma.defineExtension((client) => {
    return client.$extends({
      name: 'softDelete',
      query: {
        $allModels: {
          async delete({ model, args }: any) {
            // Instead of delete, perform an update
            return (client as any)[model].update({
              where: args.where,
              data: {
                isDeleted: true,
                deletedAt: new Date()
              }
            })
          },

          async deleteMany({ model, args }: any) {
            // Instead of deleteMany, perform updateMany
            return (client as any)[model].updateMany({
              where: args.where,
              data: {
                isDeleted: true,
                deletedAt: new Date()
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
            // Add filter to exclude soft deleted records
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
  })
}