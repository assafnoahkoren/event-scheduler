import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '../db'

export const userRouter = router({
  // Get user by ID - only if they share an organization with the requesting user
  getById: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // If requesting own profile, allow
      if (ctx.user.id === input.userId) {
        const user = await prisma.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        })

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          })
        }

        return user
      }

      // Check if users share an organization
      // Get all organizations the requesting user belongs to (as owner or member)
      const requestingUserOrgs = await prisma.organization.findMany({
        where: {
          isDeleted: false,
          OR: [
            { ownerId: ctx.user.id },
            {
              members: {
                some: {
                  userId: ctx.user.id,
                  isActive: true,
                },
              },
            },
          ],
        },
        select: { id: true },
      })

      const orgIds = requestingUserOrgs.map((org) => org.id)

      // Check if the target user is in any of these organizations
      const targetUserInSharedOrg = await prisma.organization.findFirst({
        where: {
          id: { in: orgIds },
          isDeleted: false,
          OR: [
            { ownerId: input.userId },
            {
              members: {
                some: {
                  userId: input.userId,
                  isActive: true,
                },
              },
            },
          ],
        },
      })

      if (!targetUserInSharedOrg) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this user',
        })
      }

      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      return user
    }),
})
