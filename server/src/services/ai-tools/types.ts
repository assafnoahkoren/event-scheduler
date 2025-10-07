import OpenAI from 'openai'

/**
 * AI Tool Configuration Types
 */

export type ToolMetadata = {
  successMessage: string
  errorMessage: string
  tool: OpenAI.Chat.Completions.ChatCompletionTool
  execute: (userId: string, args: any) => Promise<any>
}

export type ToolRegistry = Record<string, ToolMetadata>
