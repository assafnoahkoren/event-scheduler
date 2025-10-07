import { router, protectedProcedure } from '../trpc'
import { aiService } from '../services/ai.service'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '../db'

// Input/Output schemas
const conversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const processVoiceSchema = z.object({
  audioData: z.string(), // base64 encoded audio (WebM format)
  siteId: z.string().uuid().optional(), // Optional site context
  organizationId: z.string().uuid().optional(), // Optional organization context
  conversationHistory: z.array(conversationMessageSchema).optional(), // Conversation context
  language: z.string().optional(), // User's language preference (e.g., 'en', 'ar', 'he')
})

export const aiRouter = router({
  /**
   * Process voice command
   * - Accepts base64 encoded audio
   * - Transcribes using Whisper
   * - Processes with GPT-4
   * - Executes actions
   * - Returns results
   */
  processVoice: protectedProcedure
    .input(processVoiceSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { audioData, siteId, organizationId, conversationHistory, language } = input

        // Decode base64 audio to buffer
        const audioBuffer = Buffer.from(audioData, 'base64')

        // Validate buffer size (max 25MB for Whisper)
        const maxSize = 25 * 1024 * 1024 // 25MB
        if (audioBuffer.length > maxSize) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Audio file too large. Maximum size is 25MB.',
          })
        }

        // Step 1: Transcribe audio
        const transcribedText = await aiService.transcribeAudio(audioBuffer)

        if (!transcribedText || transcribedText.trim().length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No speech detected in audio',
          })
        }

        // Step 2: Get user context (organization and site if not provided)
        let contextOrgId = organizationId
        let contextSiteId = siteId

        // If no org/site provided, get user's default
        if (!contextOrgId) {
          const userOrg = await prisma.organizationMember.findFirst({
            where: {
              userId: ctx.user.id,
              isActive: true,
              isDeleted: false,
            },
            orderBy: {
              createdAt: 'asc', // Get first joined org
            },
            select: {
              organizationId: true,
            },
          })

          if (userOrg) {
            contextOrgId = userOrg.organizationId
          }
        }

        if (!contextSiteId && contextOrgId) {
          const userSite = await prisma.siteUser.findFirst({
            where: {
              userId: ctx.user.id,
              site: {
                organizationId: contextOrgId,
              },
            },
            orderBy: {
              createdAt: 'asc', // Get first joined site
            },
            select: {
              siteId: true,
            },
          })

          if (userSite) {
            contextSiteId = userSite.siteId
          }
        }

        // Step 3: Process command with GPT-4 (including conversation history and language)
        const result = await aiService.processCommand(
          ctx.user.id,
          transcribedText,
          {
            organizationId: contextOrgId,
            siteId: contextSiteId,
          },
          conversationHistory,
          language
        )

        // Return results
        return {
          transcribedText,
          message: result.message,
          actions: result.actions,
        }
      } catch (error: any) {
        // If it's already a TRPCError, re-throw it
        if (error instanceof TRPCError) {
          throw error
        }

        // Otherwise wrap it
        console.error('AI processVoice error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to process voice command',
          cause: error,
        })
      }
    }),
})
