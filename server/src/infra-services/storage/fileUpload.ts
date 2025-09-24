import multer from 'multer'
import { storageService, UploadOptions } from './storage.service'

// File type categories
export const FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'] as string[],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
  ] as string[],
  ALL: ['*'] as string[]
}

// File size limits
export const FILE_SIZE_LIMITS = {
  SMALL: 2 * 1024 * 1024,      // 2MB
  MEDIUM: 5 * 1024 * 1024,     // 5MB
  LARGE: 10 * 1024 * 1024,     // 10MB
  XLARGE: 50 * 1024 * 1024,    // 50MB
} as const

// Upload configurations for different use cases
export const UPLOAD_CONFIGS = {
  PROFILE_IMAGES: {
    folder: 'profiles',
    maxSize: FILE_SIZE_LIMITS.SMALL,
    allowedTypes: FILE_TYPES.IMAGES,
  },
  SERVICE_DOCUMENTS: {
    folder: 'services',
    maxSize: FILE_SIZE_LIMITS.LARGE,
    allowedTypes: [...FILE_TYPES.IMAGES, ...FILE_TYPES.DOCUMENTS],
  },
  EVENT_ATTACHMENTS: {
    folder: 'events',
    maxSize: FILE_SIZE_LIMITS.LARGE,
    allowedTypes: [...FILE_TYPES.IMAGES, ...FILE_TYPES.DOCUMENTS],
  },
  GENERAL: {
    folder: 'uploads',
    maxSize: FILE_SIZE_LIMITS.MEDIUM,
    allowedTypes: [...FILE_TYPES.IMAGES, ...FILE_TYPES.DOCUMENTS],
  },
} as const

/**
 * Multer memory storage configuration
 * Files will be stored in memory as Buffer objects
 */
export const memoryStorage = multer.memoryStorage()

/**
 * Create multer middleware with file validation
 */
export const createUploadMiddleware = (config: {
  maxSize?: number
  allowedTypes?: string[]
  maxFiles?: number
}) => {
  const { maxSize = FILE_SIZE_LIMITS.MEDIUM, allowedTypes = [], maxFiles = 1 } = config

  return multer({
    storage: memoryStorage,
    limits: {
      fileSize: maxSize,
      files: maxFiles,
    },
    fileFilter: (_req, file, cb) => {
      // Check if file type is allowed
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return cb(new Error(`File type ${file.mimetype} is not allowed`))
      }
      cb(null, true)
    },
  })
}

/**
 * Helper function to upload file to storage service
 */
export const uploadFileToStorage = async (
  file: Express.Multer.File,
  options: UploadOptions = {}
) => {
  if (!file.buffer) {
    throw new Error('File buffer is required')
  }

  return storageService.uploadFile(file.buffer, {
    fileName: file.originalname,
    contentType: file.mimetype,
    ...options,
  })
}

/**
 * Helper function to upload multiple files to storage service
 */
export const uploadFilesToStorage = async (
  files: Express.Multer.File[],
  options: UploadOptions = {}
) => {
  if (!files || files.length === 0) {
    throw new Error('No files provided')
  }

  const uploadPromises = files.map(file => uploadFileToStorage(file, options))
  return Promise.all(uploadPromises)
}

/**
 * Helper function to validate file type
 */
export const validateFileType = (file: Express.Multer.File, allowedTypes: string[]): boolean => {
  if (allowedTypes.length === 0 || allowedTypes.includes('*')) {
    return true
  }
  return allowedTypes.includes(file.mimetype)
}

/**
 * Helper function to validate file size
 */
export const validateFileSize = (file: Express.Multer.File, maxSize: number): boolean => {
  return file.size <= maxSize
}

/**
 * Helper function to get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2)
}

/**
 * Helper function to generate unique filename
 */
export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now()
  const extension = getFileExtension(originalName)
  const nameWithoutExt = originalName.replace(`.${extension}`, '')
  return `${nameWithoutExt}_${timestamp}.${extension}`
}

/**
 * Helper function to sanitize filename
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove special characters and spaces, replace with underscores
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
}

/**
 * Predefined multer middleware configurations
 */
export const uploadMiddlewares = {
  profileImage: createUploadMiddleware({
    ...UPLOAD_CONFIGS.PROFILE_IMAGES,
    allowedTypes: [...UPLOAD_CONFIGS.PROFILE_IMAGES.allowedTypes]
  }),
  serviceDocument: createUploadMiddleware({
    ...UPLOAD_CONFIGS.SERVICE_DOCUMENTS,
    allowedTypes: [...UPLOAD_CONFIGS.SERVICE_DOCUMENTS.allowedTypes],
    maxFiles: 5,
  }),
  eventAttachment: createUploadMiddleware({
    ...UPLOAD_CONFIGS.EVENT_ATTACHMENTS,
    allowedTypes: [...UPLOAD_CONFIGS.EVENT_ATTACHMENTS.allowedTypes],
    maxFiles: 10,
  }),
  general: createUploadMiddleware({
    ...UPLOAD_CONFIGS.GENERAL,
    allowedTypes: [...UPLOAD_CONFIGS.GENERAL.allowedTypes],
    maxFiles: 1,
  }),
}