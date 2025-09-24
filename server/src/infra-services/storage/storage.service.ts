import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

export interface StorageConfig {
  endpoint: string
  region?: string // Optional - not needed for some providers like Backblaze B2
  credentials: {
    accessKeyId: string
    secretAccessKey: string
  }
  bucket: string
  forcePathStyle: boolean
}

export interface UploadOptions {
  folder?: string
  fileName?: string
  contentType?: string
  maxSize?: number // in bytes
  allowedTypes?: string[]
}

export interface UploadResult {
  key: string
  url: string
  bucket: string
  size?: number
  contentType?: string
}

export class StorageService {
  private s3Client: S3Client
  private bucket: string
  private config: StorageConfig

  constructor(config: StorageConfig) {
    this.config = config
    this.bucket = config.bucket

    this.s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region || 'auto', // Use 'auto' if no region specified (works for most providers)
      credentials: config.credentials,
      forcePathStyle: config.forcePathStyle, // Required for MinIO
    })

    // Ensure bucket exists (mainly for development/MinIO)
    this.ensureBucketExists()
  }

  /**
   * Ensure the configured bucket exists (create if it doesn't)
   * This is mainly useful for development with MinIO
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      // Check if bucket exists
      await this.s3Client.send(new HeadBucketCommand({
        Bucket: this.bucket
      }))
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        try {
          // Bucket doesn't exist, create it
          await this.s3Client.send(new CreateBucketCommand({
            Bucket: this.bucket
          }))
          console.log(`✅ Created storage bucket: ${this.bucket}`)
        } catch (createError) {
          console.warn(`⚠️  Failed to create bucket ${this.bucket}:`, createError)
          // Don't throw - let the app continue, uploads will fail with clear error messages
        }
      } else {
        console.warn(`⚠️  Error checking bucket ${this.bucket}:`, error)
        // Don't throw - let the app continue
      }
    }
  }

  /**
   * Upload a file buffer to S3-compatible storage
   */
  async uploadFile(
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const {
      folder = 'uploads',
      fileName,
      contentType = 'application/octet-stream',
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = []
    } = options

    // Validate file size
    if (buffer.length > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize} bytes`)
    }

    // Validate content type if specified
    if (allowedTypes.length > 0 && !allowedTypes.includes(contentType)) {
      throw new Error(`File type ${contentType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`)
    }

    // Generate unique file key
    const fileId = uuidv4()
    const extension = this.getExtensionFromContentType(contentType) || 'bin'
    const key = `${folder}/${fileId}${fileName ? `_${fileName}` : ''}.${extension}`

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          uploadedAt: new Date().toISOString(),
          originalName: fileName || 'unknown',
        }
      })

      await this.s3Client.send(command)

      return {
        key,
        url: await this.getFileUrl(key),
        bucket: this.bucket,
        size: buffer.length,
        contentType,
      }
    } catch (error) {
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get a signed URL for downloading a file (for private access)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      return await getSignedUrl(this.s3Client, command, { expiresIn })
    } catch (error) {
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate a pre-signed URL for uploading a file directly from browser to S3
   */
  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      })

      return await getSignedUrl(this.s3Client, command, { expiresIn })
    } catch (error) {
      throw new Error(`Failed to generate signed upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get public URL for a file (for public access)
   */
  async getFileUrl(key: string): Promise<string> {
    // For MinIO and most S3-compatible services, construct the URL manually
    const baseUrl = this.config.endpoint.replace(/\/$/, '') // Remove trailing slash
    return `${baseUrl}/${this.bucket}/${key}`
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      await this.s3Client.send(command)
    } catch (error) {
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      await this.s3Client.send(command)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      const response = await this.s3Client.send(command)
      return {
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      }
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: Array<{ buffer: Buffer; options?: UploadOptions }>,
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(({ buffer, options }) =>
      this.uploadFile(buffer, options)
    )

    return Promise.all(uploadPromises)
  }

  /**
   * Delete multiple files from S3 storage
   * NOTE: This method is kept for cleanup operations and failed uploads.
   * User-initiated deletions now only soft-delete database records.
   */
  async deleteFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map(key => this.deleteFile(key))
    await Promise.all(deletePromises)
  }

  /**
   * Get the bucket name
   */
  getBucket(): string {
    return this.bucket
  }

  /**
   * Helper: Get file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string | null {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'application/json': 'json',
      'text/csv': 'csv',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    }

    return mimeToExt[contentType] || null
  }
}

// Create and export configured storage service instance
const createStorageService = (): StorageService => {
  const config: StorageConfig = {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION, // Optional - leave undefined if not needed
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
    },
    bucket: process.env.S3_BUCKET || 'event-scheduler-uploads',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || true,
  }

  return new StorageService(config)
}

export const storageService = createStorageService()