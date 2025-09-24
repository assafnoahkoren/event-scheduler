import { prisma } from '../../db'
import type { Prisma } from '@prisma/client'

// Define all possible object types and their relations
export const FILE_OBJECT_TYPES = {
  EVENT: 'event',
  SERVICE: 'service',
  USER: 'user',
  ORGANIZATION: 'organization',
  SITE: 'site',
} as const

export const FILE_RELATIONS = {
  // Event relations
  EVENT_ATTACHMENT: 'attachment',
  EVENT_PHOTO: 'photo',

  // Service relations
  SERVICE_DOCUMENT: 'document',
  SERVICE_IMAGE: 'image',
  SERVICE_CONTRACT: 'contract',

  // User relations
  USER_AVATAR: 'avatar',
  USER_DOCUMENT: 'document',

  // Organization relations
  ORGANIZATION_LOGO: 'logo',
  ORGANIZATION_DOCUMENT: 'document',

  // Site relations
  SITE_LOGO: 'logo',
  SITE_BANNER: 'banner',
} as const

export type FileObjectType = typeof FILE_OBJECT_TYPES[keyof typeof FILE_OBJECT_TYPES]
export type FileRelation = typeof FILE_RELATIONS[keyof typeof FILE_RELATIONS]

// Type-safe mapping between object types and their Prisma models
export interface ObjectTypeMapping {
  [FILE_OBJECT_TYPES.EVENT]: {
    model: typeof prisma.event
    include: Prisma.EventInclude
  }
  [FILE_OBJECT_TYPES.SERVICE]: {
    model: typeof prisma.serviceProviderService
    include: Prisma.ServiceProviderServiceInclude
  }
  [FILE_OBJECT_TYPES.USER]: {
    model: typeof prisma.user
    include: Prisma.UserInclude
  }
  [FILE_OBJECT_TYPES.ORGANIZATION]: {
    model: typeof prisma.organization
    include: Prisma.OrganizationInclude
  }
  [FILE_OBJECT_TYPES.SITE]: {
    model: typeof prisma.site
    include: Prisma.SiteInclude
  }
}

// Valid relations for each object type
export const VALID_RELATIONS: Record<FileObjectType, FileRelation[]> = {
  [FILE_OBJECT_TYPES.EVENT]: [
    FILE_RELATIONS.EVENT_ATTACHMENT,
    FILE_RELATIONS.EVENT_PHOTO,
  ],
  [FILE_OBJECT_TYPES.SERVICE]: [
    FILE_RELATIONS.SERVICE_DOCUMENT,
    FILE_RELATIONS.SERVICE_IMAGE,
    FILE_RELATIONS.SERVICE_CONTRACT,
  ],
  [FILE_OBJECT_TYPES.USER]: [
    FILE_RELATIONS.USER_AVATAR,
    FILE_RELATIONS.USER_DOCUMENT,
  ],
  [FILE_OBJECT_TYPES.ORGANIZATION]: [
    FILE_RELATIONS.ORGANIZATION_LOGO,
    FILE_RELATIONS.ORGANIZATION_DOCUMENT,
  ],
  [FILE_OBJECT_TYPES.SITE]: [
    FILE_RELATIONS.SITE_LOGO,
    FILE_RELATIONS.SITE_BANNER,
  ],
}

// Helper function to get the Prisma model for a given object type
export function getModelForObjectType(objectType: FileObjectType) {
  switch (objectType) {
    case FILE_OBJECT_TYPES.EVENT:
      return prisma.event
    case FILE_OBJECT_TYPES.SERVICE:
      return prisma.serviceProviderService
    case FILE_OBJECT_TYPES.USER:
      return prisma.user
    case FILE_OBJECT_TYPES.ORGANIZATION:
      return prisma.organization
    case FILE_OBJECT_TYPES.SITE:
      return prisma.site
    default:
      throw new Error(`Unknown object type: ${objectType}`)
  }
}

// Helper function to validate object type and relation combination
export function validateObjectRelation(objectType: FileObjectType, relation: FileRelation): boolean {
  const validRelations = VALID_RELATIONS[objectType]
  return validRelations.includes(relation)
}

// Helper function to check if an object exists
export async function verifyObjectExists(objectType: FileObjectType, objectId: string): Promise<boolean> {
  try {
    const model = getModelForObjectType(objectType)
    const object = await (model as any).findFirst({
      where: {
        id: objectId,
        isDeleted: false
      }
    })
    return !!object
  } catch {
    return false
  }
}

// Helper function to check if user has permission to upload files to an object
export async function verifyUserAccess(
  userId: string,
  objectType: FileObjectType,
  objectId: string
): Promise<boolean> {
  try {
    switch (objectType) {
      case FILE_OBJECT_TYPES.EVENT: {
        // User can upload to events if they have access to the event's site
        const event = await prisma.event.findFirst({
          where: {
            id: objectId,
            isDeleted: false
          },
          include: { site: true }
        })

        if (!event) return false

        // Check if user has access to the event's site
        const siteUser = await prisma.siteUser.findFirst({
          where: {
            userId,
            siteId: event.siteId,
            // Allow all roles that can interact with events
            role: {
              in: ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']
            }
          }
        })

        return !!siteUser
      }

      case FILE_OBJECT_TYPES.SERVICE: {
        // User can upload to services if they're a member of the organization that owns the service provider
        const service = await prisma.serviceProviderService.findFirst({
          where: {
            id: objectId,
            isDeleted: false
          },
          include: {
            provider: {
              include: {
                organization: true
              }
            }
          }
        })

        if (!service) return false

        // Check if user is a member of the organization that owns the service provider
        const orgMember = await prisma.organizationMember.findFirst({
          where: {
            userId,
            organizationId: service.provider.organizationId,
            isActive: true,
            isDeleted: false
          }
        })

        return !!orgMember
      }

      case FILE_OBJECT_TYPES.USER: {
        // Users can only upload files to their own profile
        return userId === objectId
      }

      case FILE_OBJECT_TYPES.ORGANIZATION: {
        // User can upload to organization if they're a member
        const orgMember = await prisma.organizationMember.findFirst({
          where: {
            userId,
            organizationId: objectId,
            isActive: true,
            isDeleted: false
          }
        })

        return !!orgMember
      }

      case FILE_OBJECT_TYPES.SITE: {
        // User can upload to site if they have editor+ permissions
        const siteUser = await prisma.siteUser.findFirst({
          where: {
            userId,
            siteId: objectId,
            role: {
              in: ['OWNER', 'ADMIN', 'EDITOR']
            }
          }
        })

        return !!siteUser
      }

      default:
        return false
    }
  } catch (error) {
    console.error('Error verifying user access:', error)
    return false
  }
}

// Helper to get files for a specific object
export async function getFilesForObject(
  objectType: FileObjectType,
  objectId: string,
  relation?: FileRelation
) {
  const where: any = {
    objectType,
    objectId,
    isDeleted: false,
  }

  if (relation) {
    where.relation = relation
  }

  return prisma.uploadedFile.findMany({
    where,
    orderBy: { createdAt: 'desc' },
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

// Helper to get a specific file with object verification and access control
export async function getFileWithObjectVerification(
  fileId: string,
  userId: string
) {
  const file = await prisma.uploadedFile.findFirst({
    where: {
      id: fileId,
      isDeleted: false,
    },
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

  if (!file) {
    return null
  }

  // Verify the related object still exists if file has an object relation
  if (file.objectType && file.objectId) {
    const objectExists = await verifyObjectExists(
      file.objectType as FileObjectType,
      file.objectId
    )

    if (!objectExists) {
      // Object no longer exists, could mark file for cleanup
      return null
    }

    // Check if user has access to the related object
    const hasAccess = await verifyUserAccess(
      userId,
      file.objectType as FileObjectType,
      file.objectId
    )

    if (!hasAccess) {
      // User doesn't have access to the related object
      return null
    }
  } else {
    // For files without object relations, only allow access to the uploader
    if (file.uploadedBy !== userId) {
      return null
    }
  }

  return file
}

// Default folder mapping for object types
export const DEFAULT_FOLDERS: Record<FileObjectType, string> = {
  [FILE_OBJECT_TYPES.EVENT]: 'events',
  [FILE_OBJECT_TYPES.SERVICE]: 'services',
  [FILE_OBJECT_TYPES.USER]: 'users',
  [FILE_OBJECT_TYPES.ORGANIZATION]: 'organizations',
  [FILE_OBJECT_TYPES.SITE]: 'sites',
}

// Get default folder for object type and relation
export function getDefaultFolder(objectType: FileObjectType, relation?: FileRelation): string {
  const baseFolder = DEFAULT_FOLDERS[objectType]
  return relation ? `${baseFolder}/${relation}` : baseFolder
}