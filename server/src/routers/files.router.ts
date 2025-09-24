import { router, protectedProcedure } from '../trpc'
import { z } from 'zod'
import {
  fileUploadService,
  listFilesSchema,
  deleteFileSchema,
  uploadFileSchema,
  getUploadUrlSchema,
  confirmUploadSchema
} from '../infra-services/storage/file-upload.service'
import {
  FILE_OBJECT_TYPES,
  FILE_RELATIONS,
} from '../infra-services/storage/file-relations'

// Input schemas for file operations
const generateSignedUrlSchema = z.object({
  fileId: z.string().uuid(),
  expiresIn: z.number().min(60).max(86400).default(3600), // 1 minute to 24 hours
})

const updateFileSchema = z.object({
  fileId: z.string().uuid(),
  originalName: z.string().optional(),
  folder: z.string().optional(),
})

const bulkDeleteSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1).max(50),
})


export const filesRouter = router({
  // Get pre-signed URL for direct browser-to-S3 upload
  getUploadUrl: protectedProcedure
    .input(getUploadUrlSchema)
    .mutation(async ({ ctx, input }) => {
      return fileUploadService.getUploadUrl(ctx.user.id, input)
    }),

  // Confirm upload after browser uploads directly to S3
  confirmUpload: protectedProcedure
    .input(confirmUploadSchema)
    .mutation(async ({ ctx, input }) => {
      return fileUploadService.confirmUpload(ctx.user.id, input)
    }),

  // Legacy server-side upload method (kept for backwards compatibility)
  upload: protectedProcedure
    .input(uploadFileSchema)
    .mutation(async ({ ctx, input }) => {
      return fileUploadService.uploadFile(ctx.user.id, input)
    }),


  // Get file by ID
  get: protectedProcedure
    .input(z.object({ fileId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return fileUploadService.getFile(ctx.user.id, input.fileId)
    }),

  // List files with filters
  list: protectedProcedure
    .input(listFilesSchema)
    .query(async ({ ctx, input }) => {
      return fileUploadService.listFiles(ctx.user.id, input)
    }),

  // Get files for a specific object
  getForObject: protectedProcedure
    .input(z.object({
      objectType: z.nativeEnum(FILE_OBJECT_TYPES),
      objectId: z.string().uuid(),
      relation: z.nativeEnum(FILE_RELATIONS).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return fileUploadService.listFiles(ctx.user.id, {
        objectType: input.objectType,
        objectId: input.objectId,
        relation: input.relation,
        limit: 100,
        offset: 0,
      })
    }),

  // Delete single file
  delete: protectedProcedure
    .input(deleteFileSchema)
    .mutation(async ({ ctx, input }) => {
      return fileUploadService.deleteFile(ctx.user.id, input.fileId)
    }),

  // Bulk delete files
  bulkDelete: protectedProcedure
    .input(bulkDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      return fileUploadService.deleteFiles(ctx.user.id, input.fileIds)
    }),

  // Generate signed URL for file access
  getSignedUrl: protectedProcedure
    .input(generateSignedUrlSchema)
    .mutation(async ({ ctx, input }) => {
      return {
        url: await fileUploadService.getSignedUrl(ctx.user.id, input.fileId, input.expiresIn),
        expiresIn: input.expiresIn,
      }
    }),

  // Update file metadata
  update: protectedProcedure
    .input(updateFileSchema)
    .mutation(async ({ ctx, input }) => {
      const { fileId, ...updates } = input
      return fileUploadService.updateFile(ctx.user.id, fileId, updates)
    }),

  // Get available object types and relations for frontend
  getObjectTypes: protectedProcedure
    .query(() => {
      return {
        objectTypes: FILE_OBJECT_TYPES,
        relations: FILE_RELATIONS,
      }
    }),

  // Get valid relations for a specific object type
  getValidRelations: protectedProcedure
    .input(z.object({
      objectType: z.nativeEnum(FILE_OBJECT_TYPES),
    }))
    .query(async ({ input }) => {
      const { VALID_RELATIONS } = await import('../infra-services/storage/file-relations')
      return {
        validRelations: VALID_RELATIONS[input.objectType],
      }
    }),
})