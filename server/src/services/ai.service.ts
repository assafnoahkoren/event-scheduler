import OpenAI from 'openai'
import { TRPCError } from '@trpc/server'
import { getAllTools, executeTool, getToolMetadata } from './ai-tools'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
    },
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    language?: string
  ): Promise<{
    message: string
    actions: ToolExecutionResult[]
  }> {
    try {
      // Get all available tools from the tools configuration
      const tools = getAllTools()

      // Language names for system prompt
      const languageNames: Record<string, string> = {
        en: 'English',
        ar: 'Arabic',
        he: 'Hebrew',
      }

      const languageName = language ? languageNames[language] || language : 'English'

      // System prompt with context
      const systemPrompt = `You are an AI assistant helping users manage their events and clients.
Current context:
- User ID: ${userId}
${userContext.organizationId ? `- Organization ID: ${userContext.organizationId}` : ''}
${userContext.siteId ? `- Site ID: ${userContext.siteId}` : ''}
- User's language: ${languageName}

IMPORTANT: Respond in ${languageName}. All your text responses must be in ${languageName}.

When creating events or clients, use the provided context IDs.
Current date: ${new Date().toISOString()}

Parse the user's request and call the appropriate function(s). If required information is missing and not inferable, respond with a helpful message in ${languageName} asking for clarification.`

      // Build messages array with conversation history
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
      ]

      // Add conversation history if provided
      if (conversationHistory && conversationHistory.length > 0) {
        conversationHistory.forEach((msg) => {
          messages.push({
            role: msg.role,
            content: msg.content,
          })
        })
      }

      // Add current user message
      messages.push({ role: 'user', content: transcribedText })

      // Call GPT-4 with function calling
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages,
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
      // Get tool metadata
      const metadata = getToolMetadata(toolName)

      if (!metadata) {
        return {
          toolName,
          success: false,
          message: `Unknown tool: ${toolName}`,
        }
      }

      // Execute tool
      const result = await executeTool(toolName, userId, args)

      return {
        toolName,
        success: true,
        message: metadata.successMessage,
        data: result,
      }
    } catch (error: any) {
      console.error(`Tool execution error (${toolName}):`, error)

      const metadata = getToolMetadata(toolName)

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
