import { TRPCError } from '@trpc/server'
import { prisma } from '../db'

// ==================== Organization Access ====================

export interface OrganizationAccessResult {
  isOwner: boolean
}

export async function checkOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<OrganizationAccessResult> {
  const org = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      isDeleted: false,
    },
  })

  if (!org) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Organization not found',
    })
  }

  if (org.ownerId === userId) {
    return { isOwner: true }
  }

  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  })

  if (!member || member.isDeleted || !member.isActive) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this organization',
    })
  }

  return { isOwner: false }
}

// ==================== Site Access ====================

export interface SiteAccessResult {
  role: string
}

export async function checkSiteAccess(
  userId: string,
  siteId: string
): Promise<SiteAccessResult> {
  const siteUser = await prisma.siteUser.findUnique({
    where: {
      userId_siteId: {
        userId,
        siteId,
      },
    },
  })

  if (!siteUser) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this site',
    })
  }

  return { role: siteUser.role }
}

// ==================== Role Helpers ====================

export function canEdit(role: string): boolean {
  return role !== 'VIEWER'
}

export function isAdminOrOwner(role: string): boolean {
  return role === 'ADMIN' || role === 'OWNER'
}
