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
        // No language parameter - let Whisper auto-detect for maximum flexibility
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

      // Get current date/time for context
      const now = new Date()
      const currentDateTime = now.toISOString()
      const currentDate = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      const currentTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })

      // System prompt with context
      const systemPrompt = `You are an AI assistant helping users manage their events and clients.

Current context:
- User ID: ${userId}
${userContext.organizationId ? `- Organization ID: ${userContext.organizationId}` : ''}
${userContext.siteId ? `- Site ID: ${userContext.siteId}` : ''}
- User's language: ${languageName}

IMPORTANT DATE/TIME CONTEXT:
- Current date and time (ISO): ${currentDateTime}
- Current date (human): ${currentDate}
- Current time: ${currentTime}

Use this date/time information when the user says "today", "tomorrow", "next week", "this afternoon", etc.
When creating events, convert relative dates to absolute ISO 8601 format.

IMPORTANT: Respond in ${languageName}. All your text responses must be in ${languageName}.

When creating events or clients, use the provided context IDs.

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

      // Agentic loop: Allow GPT-4 to make multiple tool calls in sequence
      const actions: ToolExecutionResult[] = []
      const maxIterations = 10 // Prevent infinite loops
      let currentMessages = [...messages]

      console.log('\n🤖 AI Assistant - Starting agentic workflow')
      console.log(`📝 User command: "${transcribedText}"`)

      for (let iteration = 0; iteration < maxIterations; iteration++) {
        console.log(`\n🔄 Iteration ${iteration + 1}/${maxIterations}`)

        // Call GPT-4o with function calling
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: currentMessages,
          tools: tools,
          tool_choice: 'auto',
        })

        const responseMessage = completion.choices[0]?.message

        if (!responseMessage) {
          throw new Error('No response from GPT-4')
        }

        // If no tool calls, we're done
        if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
          console.log('✅ GPT-4 finished - no more tools to call')
          if (responseMessage.content) {
            console.log(`💬 Final message: "${responseMessage.content}"`)
          }

          const message = responseMessage.content ||
            (actions.length > 0 ? 'Actions completed successfully' : 'No actions taken')

          console.log(`\n📊 Summary: Executed ${actions.length} action(s) across ${iteration + 1} iteration(s)`)
          return {
            message,
            actions,
          }
        }

        // Execute tool calls
        console.log(`🔧 GPT-4o wants to call ${responseMessage.tool_calls.length} tool(s):`)
        responseMessage.tool_calls.forEach((tc: OpenAI.Chat.Completions.ChatCompletionMessageToolCall, idx: number) => {
          if (tc.type === 'function') {
            console.log(`   ${idx + 1}. ${tc.function.name}(${tc.function.arguments})`)
          }
        })

        currentMessages.push(responseMessage)

        for (const toolCall of responseMessage.tool_calls) {
          const toolName = toolCall.type === 'function' ? toolCall.function.name : 'unknown'
          console.log(`\n⚙️  Executing: ${toolName}`)
          const result = await this.executeToolCall(userId, toolCall)
          actions.push(result)

          console.log(`   ${result.success ? '✅' : '❌'} ${result.message}`)
          if (result.data) {
            console.log(`   📦 Data:`, JSON.stringify(result.data, null, 2).substring(0, 200))
          }

          // Add tool result to conversation for next iteration
          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: result.success,
              data: result.data,
              message: result.message,
            }),
          })
        }

        // If any action failed, stop the loop
        if (actions.some((action) => !action.success)) {
          console.log('\n❌ Stopping workflow - an action failed')
          break
        }
      }

      // Return final message and all actions
      const message = actions.length > 0
        ? 'Actions completed successfully'
        : 'No actions taken'

      console.log(`\n📊 Summary: Executed ${actions.length} action(s) - reached max iterations`)
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
