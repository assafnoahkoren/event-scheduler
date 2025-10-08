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

const confirmActionSchema = z.object({
  toolCall: z.any(), // The tool call data that needs to be confirmed
  siteId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
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

        // Step 1: Transcribe audio (Whisper auto-detects language)
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

  /**
   * Confirm and execute a delete/remove action
   */
  confirmAction: protectedProcedure
    .input(confirmActionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { toolCall } = input

        // Import executeTool directly
        const { executeTool, getToolMetadata } = await import('../services/ai-tools')

        if (!toolCall || toolCall.type !== 'function') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid tool call data',
          })
        }

        const toolName = toolCall.function.name
        const args = JSON.parse(toolCall.function.arguments)

        // Execute the confirmed tool
        const result = await executeTool(toolName, ctx.user.id, args)
        const metadata = getToolMetadata(toolName)

        return {
          success: true,
          message: metadata?.successMessage || 'Action completed successfully',
          data: result,
        }
      } catch (error: any) {
        console.error('AI confirmAction error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to execute confirmed action',
          cause: error,
        })
      }
    }),
})
