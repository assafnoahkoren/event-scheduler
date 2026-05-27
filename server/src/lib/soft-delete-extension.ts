import { Prisma } from '@prisma/client'

/**
 * Prisma Client extension for soft deletes
 * Automatically applies to all models that have soft delete fields (isDeleted, deletedAt)
 * Intercepts delete operations and converts them to updates
 * Also filters out soft-deleted records from queries
 *
 * Models listed in MODELS_WITHOUT_SOFT_DELETE are skipped — they have no isDeleted column
 * (e.g. immutable ledger/audit tables).
 */

/** Models that intentionally have no isDeleted column — skip soft-delete logic for these. */
const MODELS_WITHOUT_SOFT_DELETE = new Set(['StockLedgerEntry'])

export function softDeleteExtension() {
  return Prisma.defineExtension((client) => {
    return client.$extends({
      name: 'softDelete',
      query: {
        $allModels: {
          async delete({ model, args }: any) {
            if (MODELS_WITHOUT_SOFT_DELETE.has(model)) {
              return (client as any)[model].delete(args)
            }
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
            if (MODELS_WITHOUT_SOFT_DELETE.has(model)) {
              return (client as any)[model].deleteMany(args)
            }
            // Instead of deleteMany, perform updateMany
            return (client as any)[model].updateMany({
              where: args.where,
              data: {
                isDeleted: true,
                deletedAt: new Date()
              }
            })
          },

          async findFirst({ model, args, query }: any) {
            if (MODELS_WITHOUT_SOFT_DELETE.has(model)) {
              return query(args)
            }
            // Add filter to exclude soft deleted records
            args.where = {
              ...args.where,
              isDeleted: false
            }
            return query(args)
          },

          async findUnique({ model, args, query }: any) {
            if (MODELS_WITHOUT_SOFT_DELETE.has(model)) {
              return query(args)
            }
            // Add filter to exclude soft deleted records
            args.where = {
              ...args.where,
              isDeleted: false
            }
            return query(args)
          },

          async findMany({ model, args, query }: any) {
            if (MODELS_WITHOUT_SOFT_DELETE.has(model)) {
              return query(args)
            }
            // Add filter to exclude soft deleted records
            if (!args.where) {
              args.where = {}
            }
            if (args.where.isDeleted === undefined) {
              args.where.isDeleted = false
            }
            return query(args)
          },

          async findUniqueOrThrow({ model, args, query }: any) {
            if (MODELS_WITHOUT_SOFT_DELETE.has(model)) {
              return query(args)
            }
            // Add filter to exclude soft deleted records
            args.where = {
              ...args.where,
              isDeleted: false
            }
            return query(args)
          },

          async findFirstOrThrow({ model, args, query }: any) {
            if (MODELS_WITHOUT_SOFT_DELETE.has(model)) {
              return query(args)
            }
            // Add filter to exclude soft deleted records
            args.where = {
              ...args.where,
              isDeleted: false
            }
            return query(args)
          },

          async count({ model, args, query }: any) {
            if (MODELS_WITHOUT_SOFT_DELETE.has(model)) {
              return query(args)
            }
            // Add filter to exclude soft deleted records
            if (!args.where) {
              args.where = {}
            }
            if (args.where.isDeleted === undefined) {
              args.where.isDeleted = false
            }
            return query(args)
          },

          async aggregate({ model, args, query }: any) {
            if (MODELS_WITHOUT_SOFT_DELETE.has(model)) {
              return query(args)
            }
            // Add filter to exclude soft deleted records
            if (!args.where) {
              args.where = {}
            }
            if (args.where.isDeleted === undefined) {
              args.where.isDeleted = false
            }
            return query(args)
          },

          async groupBy({ model, args, query }: any) {
            if (MODELS_WITHOUT_SOFT_DELETE.has(model)) {
              return query(args)
            }
            // Add filter to exclude soft deleted records
            if (!args.where) {
              args.where = {}
            }
            if (args.where.isDeleted === undefined) {
              args.where.isDeleted = false
            }
            return query(args)
          },

          async update({ model, args, query }: any) {
            if (MODELS_WITHOUT_SOFT_DELETE.has(model)) {
              return query(args)
            }
            // Add filter to prevent updating soft deleted records
            args.where = {
              ...args.where,
              isDeleted: false
            }
            return query(args)
          },

          async updateMany({ model, args, query }: any) {
            if (MODELS_WITHOUT_SOFT_DELETE.has(model)) {
              return query(args)
            }
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