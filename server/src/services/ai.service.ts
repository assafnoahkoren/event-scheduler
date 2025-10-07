import OpenAI from 'openai'
import { eventService, createEventSchema } from './event.service'
import { clientService, createClientSchema } from './client.service'
import { TRPCError } from '@trpc/server'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Action metadata for toast messages
export const actionMetadata = {
  createEvent: {
    successMessage: 'Event created successfully',
    errorMessage: 'Failed to create event',
  },
  createClient: {
    successMessage: 'Client added successfully',
    errorMessage: 'Failed to add client',
  },
} as const

// Tool execution result type
export type ToolExecutionResult = {
  toolName: string
  success: boolean
  message: string
  data?: any
}

// AI Service class
class AIService {
  /**
   * Transcribe audio using OpenAI Whisper API
   */
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      // Create a File object from buffer for Whisper API
      const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' })

      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'en', // Can be made dynamic if needed
      })

      return transcription.text
    } catch (error: any) {
      console.error('Whisper transcription error:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to transcribe audio',
        cause: error,
      })
    }
  }

  /**
   * Process user command with GPT-4 and execute tools
   */
  async processCommand(
    userId: string,
    transcribedText: string,
    userContext: {
      organizationId?: string
      siteId?: string
    }
  ): Promise<{
    message: string
    actions: ToolExecutionResult[]
  }> {
    try {
      // Define tools for GPT-4 function calling
      const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
        {
          type: 'function',
          function: {
            name: 'createEvent',
            description: 'Create a new event/appointment for the user. Use this when the user wants to schedule, create, or add an event.',
            parameters: {
              type: 'object',
              properties: {
                siteId: {
                  type: 'string',
                  description: 'Site ID where the event will be created',
                },
                title: {
                  type: 'string',
                  description: 'Event title or name',
                },
                description: {
                  type: 'string',
                  description: 'Event description (optional)',
                },
                clientId: {
                  type: 'string',
                  description: 'Client ID if the event is for a specific client (optional)',
                },
                startDate: {
                  type: 'string',
                  description: 'Event start date and time in ISO 8601 format (e.g., 2025-12-25T10:00:00Z)',
                },
                endDate: {
                  type: 'string',
                  description: 'Event end date and time in ISO 8601 format (optional)',
                },
                isAllDay: {
                  type: 'boolean',
                  description: 'Whether this is an all-day event',
                },
              },
              required: ['siteId', 'title', 'startDate'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'createClient',
            description: 'Create a new client/customer for the organization. Use this when the user wants to add a new client.',
            parameters: {
              type: 'object',
              properties: {
                organizationId: {
                  type: 'string',
                  description: 'Organization ID where the client will be created',
                },
                name: {
                  type: 'string',
                  description: 'Client full name',
                },
                email: {
                  type: 'string',
                  description: 'Client email address (optional)',
                },
                phone: {
                  type: 'string',
                  description: 'Client phone number (optional)',
                },
                address: {
                  type: 'string',
                  description: 'Client address (optional)',
                },
                notes: {
                  type: 'string',
                  description: 'Additional notes about the client (optional)',
                },
              },
              required: ['organizationId', 'name'],
            },
          },
        },
      ]

      // System prompt with context
      const systemPrompt = `You are an AI assistant helping users manage their events and clients.
Current context:
- User ID: ${userId}
${userContext.organizationId ? `- Organization ID: ${userContext.organizationId}` : ''}
${userContext.siteId ? `- Site ID: ${userContext.siteId}` : ''}

When creating events or clients, use the provided context IDs.
Current date: ${new Date().toISOString()}

Parse the user's request and call the appropriate function(s). If required information is missing and not inferable, respond with a helpful message asking for clarification.`

      // Call GPT-4 with function calling
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcribedText },
        ],
        tools: tools,
        tool_choice: 'auto',
      })

      const responseMessage = completion.choices[0]?.message

      if (!responseMessage) {
        throw new Error('No response from GPT-4')
      }

      // Execute tool calls if any
      const actions: ToolExecutionResult[] = []

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        for (const toolCall of responseMessage.tool_calls) {
          const result = await this.executeToolCall(userId, toolCall)
          actions.push(result)
        }
      }

      // Return message and actions
      const message = responseMessage.content ||
        (actions.length > 0 ? 'Actions completed successfully' : 'No actions taken')

      return {
        message,
        actions,
      }
    } catch (error: any) {
      console.error('GPT-4 processing error:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process command',
        cause: error,
      })
    }
  }

  /**
   * Execute a tool call from GPT-4
   */
  private async executeToolCall(
    userId: string,
    toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
  ): Promise<ToolExecutionResult> {
    // Type guard for function tool calls
    if (toolCall.type !== 'function') {
      return {
        toolName: 'unknown',
        success: false,
        message: 'Unsupported tool call type',
      }
    }

    const toolName = toolCall.function.name
    const args = JSON.parse(toolCall.function.arguments)

    try {
      switch (toolName) {
        case 'createEvent': {
          // Validate input against schema
          const validatedInput = createEventSchema.parse(args)

          // Execute event creation
          const event = await eventService.createEvent(userId, validatedInput)

          return {
            toolName,
            success: true,
            message: actionMetadata.createEvent.successMessage,
            data: event,
          }
        }

        case 'createClient': {
          // Validate input against schema
          const validatedInput = createClientSchema.parse(args)

          // Execute client creation
          const client = await clientService.createClient(userId, validatedInput)

          return {
            toolName,
            success: true,
            message: actionMetadata.createClient.successMessage,
            data: client,
          }
        }

        default:
          return {
            toolName,
            success: false,
            message: `Unknown tool: ${toolName}`,
          }
      }
    } catch (error: any) {
      console.error(`Tool execution error (${toolName}):`, error)

      const metadata = actionMetadata[toolName as keyof typeof actionMetadata]

      return {
        toolName,
        success: false,
        message: metadata?.errorMessage || `Failed to execute ${toolName}`,
        data: { error: error.message },
      }
    }
  }
}

// Export singleton instance
export const aiService = new AIService()
