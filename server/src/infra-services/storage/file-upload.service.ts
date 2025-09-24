import { z } from 'zod'
import { prisma } from '../../db'
import { storageService, UploadResult } from './storage.service'
import { TRPCError } from '@trpc/server'
import {
  FILE_OBJECT_TYPES,
  FILE_RELATIONS,
  type FileObjectType,
  type FileRelation,
  validateObjectRelation,
  verifyObjectExists,
  verifyUserAccess,
  getFilesForObject,
  getFileWithObjectVerification,
  getDefaultFolder,
} from './file-relations'

// File record schemas
export const uploadFileSchema = z.object({
  fileName: z.string(),
  fileData: z.string(), // Base64 encoded
  contentType: z.string(),
  objectType: z.nativeEnum(FILE_OBJECT_TYPES),
  objectId: z.string().uuid(),
  relation: z.nativeEnum(FILE_RELATIONS),
  folder: z.string().optional(),
})

export const deleteFileSchema = z.object({
  fileId: z.string().uuid(),
})

export const getUploadUrlSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  objectType: z.nativeEnum(FILE_OBJECT_TYPES),
  objectId: z.string().uuid(),
  relation: z.nativeEnum(FILE_RELATIONS),
  folder: z.string().optional(),
})

export const confirmUploadSchema = z.object({
  key: z.string(),
  originalName: z.string(),
  size: z.number(),
  contentType: z.string(),
  objectType: z.nativeEnum(FILE_OBJECT_TYPES),
  objectId: z.string().uuid(),
  relation: z.nativeEnum(FILE_RELATIONS),
  folder: z.string().optional(),
})

export const listFilesSchema = z.object({
  objectType: z.nativeEnum(FILE_OBJECT_TYPES).optional(),
  objectId: z.string().uuid().optional(),
  relation: z.nativeEnum(FILE_RELATIONS).optional(),
  folder: z.string().optional(),
  uploadedBy: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

// Type exports
export type UploadFileInput = z.infer<typeof uploadFileSchema>
export type DeleteFileInput = z.infer<typeof deleteFileSchema>
export type GetUploadUrlInput = z.infer<typeof getUploadUrlSchema>
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>
export type ListFilesInput = z.infer<typeof listFilesSchema>

export interface FileUploadResult extends UploadResult {
  id: string
  originalName: string
  uploadedAt: Date
}

class FileUploadService {
  /**
   * Generate pre-signed URL for direct browser-to-S3 upload
   */
  async getUploadUrl(userId: string, input: GetUploadUrlInput): Promise<{
    uploadUrl: string
    key: string
    expiresIn: number
  }> {
    // Validate object type and relation combination
    if (!validateObjectRelation(input.objectType, input.relation)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid relation '${input.relation}' for object type '${input.objectType}'`
      })
    }

    // Verify that the related object exists
    const objectExists = await verifyObjectExists(input.objectType, input.objectId)
    if (!objectExists) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `${input.objectType} with ID ${input.objectId} not found`
      })
    }

    // Verify user has permission to upload files to this object
    const hasAccess = await verifyUserAccess(userId, input.objectType, input.objectId)
    if (!hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You don't have permission to upload files to this ${input.objectType}`
      })
    }

    // Validate file constraints based on relation
    const uploadOptions = this.getUploadOptionsForRelation(input.objectType, input.relation)

    // Validate content type
    if (uploadOptions.allowedTypes && !uploadOptions.allowedTypes.includes(input.contentType)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `File type ${input.contentType} is not allowed for ${input.relation} files`
      })
    }

    // Generate unique file key
    const folder = input.folder || getDefaultFolder(input.objectType, input.relation)
    const timestamp = Date.now()
    const key = `${folder}/${timestamp}_${input.fileName}`

    // Generate pre-signed URL
    const expiresIn = 3600 // 1 hour
    const uploadUrl = await storageService.getSignedUploadUrl(key, input.contentType, expiresIn)

    return {
      uploadUrl,
      key,
      expiresIn,
    }
  }

  /**
   * Confirm upload and create database record after browser uploads directly to S3
   */
  async confirmUpload(userId: string, input: ConfirmUploadInput): Promise<FileUploadResult> {
    // Re-validate permissions (user could have lost access between getting URL and confirming)
    const hasAccess = await verifyUserAccess(userId, input.objectType, input.objectId)
    if (!hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You don't have permission to upload files to this ${input.objectType}`
      })
    }

    // Verify file was actually uploaded to S3
    const fileExists = await storageService.fileExists(input.key)
    if (!fileExists) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'File was not found in storage. Please try uploading again.'
      })
    }

    // Get file metadata from S3 to verify size and content type
    const metadata = await storageService.getFileMetadata(input.key)

    // Validate file constraints
    const uploadOptions = this.getUploadOptionsForRelation(input.objectType, input.relation)

    if (metadata.size && metadata.size > (uploadOptions.maxSize || Infinity)) {
      // Clean up the uploaded file since it violates constraints
      await storageService.deleteFile(input.key)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `File size ${metadata.size} bytes exceeds maximum allowed size of ${uploadOptions.maxSize} bytes`
      })
    }

    try {
      // Create file record in database
      const fileRecord = await prisma.uploadedFile.create({
        data: {
          originalName: input.originalName,
          key: input.key,
          url: await storageService.getFileUrl(input.key),
          bucket: storageService.getBucket(),
          size: input.size,
          contentType: input.contentType,
          folder: input.folder || getDefaultFolder(input.objectType, input.relation),
          objectId: input.objectId,
          objectType: input.objectType,
          relation: input.relation,
          uploadedBy: userId,
        },
      })

      return {
        key: input.key,
        url: fileRecord.url,
        bucket: fileRecord.bucket,
        size: input.size,
        contentType: input.contentType,
        id: fileRecord.id,
        originalName: fileRecord.originalName,
        uploadedAt: fileRecord.createdAt,
      }
    } catch (error) {
      // If database record creation fails, try to clean up the uploaded file
      try {
        await storageService.deleteFile(input.key)
      } catch (cleanupError) {
        console.error('Failed to cleanup file after database error:', cleanupError)
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create file record',
        cause: error,
      })
    }
  }

  /**
   * Upload file with object relation (legacy method for server-side uploads)
   */
  async uploadFile(userId: string, input: UploadFileInput): Promise<FileUploadResult> {
    // Validate object type and relation combination
    if (!validateObjectRelation(input.objectType, input.relation)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid relation '${input.relation}' for object type '${input.objectType}'`
      })
    }

    // Verify that the related object exists
    const objectExists = await verifyObjectExists(input.objectType, input.objectId)
    if (!objectExists) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `${input.objectType} with ID ${input.objectId} not found`
      })
    }

    // Verify user has permission to upload files to this object
    const hasAccess = await verifyUserAccess(userId, input.objectType, input.objectId)
    if (!hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You don't have permission to upload files to this ${input.objectType}`
      })
    }

    // Decode file data
    const buffer = Buffer.from(input.fileData, 'base64')

    // Create mock multer file object
    const file: Express.Multer.File = {
      buffer,
      originalname: input.fileName,
      mimetype: input.contentType,
      size: buffer.length,
      fieldname: 'file',
      encoding: '7bit',
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    }

    // Determine upload options based on object type and relation
    const uploadOptions = this.getUploadOptionsForRelation(input.objectType, input.relation)

    // Upload to storage
    const uploadResult = await this.uploadToStorage(file, {
      ...uploadOptions,
      folder: input.folder || getDefaultFolder(input.objectType, input.relation)
    })
    try {
      // Create file record in database
      const fileRecord = await prisma.uploadedFile.create({
        data: {
          originalName: input.fileName,
          key: uploadResult.key,
          url: uploadResult.url,
          bucket: uploadResult.bucket,
          size: uploadResult.size,
          contentType: uploadResult.contentType,
          folder: input.folder || getDefaultFolder(input.objectType, input.relation),
          objectId: input.objectId,
          objectType: input.objectType,
          relation: input.relation,
          uploadedBy: userId,
        },
      })

      return {
        ...uploadResult,
        id: fileRecord.id,
        originalName: fileRecord.originalName,
        uploadedAt: fileRecord.createdAt,
      }
    } catch (error) {
      // If database record creation fails, try to clean up the uploaded file
      try {
        await storageService.deleteFile(uploadResult.key)
      } catch (cleanupError) {
        console.error('Failed to cleanup file after database error:', cleanupError)
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create file record',
        cause: error,
      })
    }
  }

  /**
   * Upload file to storage (internal helper)
   */
  private async uploadToStorage(file: Express.Multer.File, options: any) {
    return storageService.uploadFile(file.buffer, {
      fileName: file.originalname,
      contentType: file.mimetype,
      ...options,
    })
  }

  /**
   * Get upload options based on object type and relation
   */
  private getUploadOptionsForRelation(_objectType: FileObjectType, relation: FileRelation) {
    // Define upload restrictions based on relation type
    switch (relation) {
      case FILE_RELATIONS.USER_AVATAR:
      case FILE_RELATIONS.ORGANIZATION_LOGO:
      case FILE_RELATIONS.SITE_LOGO:
      case FILE_RELATIONS.SITE_BANNER:
      case FILE_RELATIONS.SERVICE_IMAGE:
      case FILE_RELATIONS.EVENT_PHOTO:
        return {
          maxSize: 2 * 1024 * 1024, // 2MB
          allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        }

      case FILE_RELATIONS.SERVICE_DOCUMENT:
      case FILE_RELATIONS.SERVICE_CONTRACT:
      case FILE_RELATIONS.USER_DOCUMENT:
      case FILE_RELATIONS.ORGANIZATION_DOCUMENT:
        return {
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg', 'image/jpg', 'image/png'
          ],
        }

      case FILE_RELATIONS.EVENT_ATTACHMENT:
      default:
        return {
          maxSize: 5 * 1024 * 1024, // 5MB
          allowedTypes: [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'text/plain'
          ],
        }
    }
  }

  /**
   * Get file by ID
   */
  async getFile(userId: string, fileId: string) {
    const file = await getFileWithObjectVerification(fileId, userId)

    if (!file) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'File not found or related object no longer exists'
      })
    }

    return file
  }

  /**
   * List files with filters
   */
  async listFiles(userId: string, input: ListFilesInput) {
    // If objectType and objectId are provided, check access first
    if (input.objectType && input.objectId) {
      // Verify user has access to the object
      const hasAccess = await verifyUserAccess(userId, input.objectType, input.objectId)
      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `You don't have permission to view files for this ${input.objectType}`
        })
      }

      const files = await getFilesForObject(
        input.objectType,
        input.objectId,
        input.relation
      )
      return {
        files,
        total: files.length,
        hasMore: false,
      }
    }

    // Otherwise, use traditional filtering
    const where: any = {
      isDeleted: false,
    }

    if (input.folder) {
      where.folder = input.folder
    }

    if (input.objectType) {
      where.objectType = input.objectType
    }

    if (input.relation) {
      where.relation = input.relation
    }

    if (input.uploadedBy) {
      where.uploadedBy = input.uploadedBy
    } else {
      // Default to current user's files if no specific user requested
      where.uploadedBy = userId
    }

    const [files, total] = await Promise.all([
      prisma.uploadedFile.findMany({
        where,
        include: {
          uploadedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: input.limit,
        skip: input.offset,
      }),
      prisma.uploadedFile.count({ where }),
    ])

    return {
      files,
      total,
      hasMore: input.offset + files.length < total,
    }
  }

  /**
   * Delete file (both from storage and database)
   */
  async deleteFile(userId: string, fileId: string) {
    // Use the access-controlled file getter
    const file = await getFileWithObjectVerification(fileId, userId)

    if (!file) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'File not found or you do not have permission to access it',
      })
    }

    // Additional check: only allow deletion by uploader or users with object access
    const canDelete = file.uploadedBy === userId ||
      (file.objectType && file.objectId && await verifyUserAccess(userId, file.objectType as FileObjectType, file.objectId))

    if (!canDelete) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this file',
      })
    }

    try {
      // Delete from storage
      await storageService.deleteFile(file.key)
    } catch (error) {
      console.error('Failed to delete file from storage:', error)
      // Continue with database deletion even if storage deletion fails
    }

    // Soft delete from database
    await prisma.uploadedFile.delete({
      where: { id: fileId },
    })

    return { success: true }
  }

  /**
   * Generate signed URL for file access
   */
  async getSignedUrl(userId: string, fileId: string, expiresIn: number = 3600) {
    const file = await this.getFile(userId, fileId)
    return storageService.getSignedUrl(file.key, expiresIn)
  }

  /**
   * Bulk delete files
   */
  async deleteFiles(userId: string, fileIds: string[]) {
    const files = await prisma.uploadedFile.findMany({
      where: {
        id: { in: fileIds },
        isDeleted: false,
        uploadedBy: userId, // Only allow deleting own files
      },
    })

    if (files.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No files found to delete',
      })
    }

    // Delete from storage
    const storageKeys = files.map(file => file.key)
    try {
      await storageService.deleteFiles(storageKeys)
    } catch (error) {
      console.error('Failed to delete some files from storage:', error)
      // Continue with database deletion
    }

    // Soft delete from database
    await prisma.uploadedFile.deleteMany({
      where: {
        id: { in: files.map(file => file.id) },
      },
    })

    return {
      success: true,
      deletedCount: files.length
    }
  }

  /**
   * Update file metadata
   */
  async updateFile(
    userId: string,
    fileId: string,
    updates: {
      originalName?: string
      folder?: string
    }
  ) {
    const file = await prisma.uploadedFile.findFirst({
      where: {
        id: fileId,
        isDeleted: false,
      },
    })

    if (!file) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'File not found',
      })
    }

    // TODO: Add permission checking
    if (file.uploadedBy !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to update this file',
      })
    }

    return prisma.uploadedFile.update({
      where: { id: fileId },
      data: updates,
      include: {
        uploadedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })
  }
}

export const fileUploadService = new FileUploadService()