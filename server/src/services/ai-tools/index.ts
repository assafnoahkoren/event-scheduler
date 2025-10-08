import OpenAI from 'openai'
import type { ToolMetadata, ToolRegistry } from './types'
import { eventTools } from './events'
import { clientTools } from './clients'
import { productTools } from './products'
import { eventProductTools } from './event-products'
import { serviceProviderTools } from './service-providers'
import { eventServiceTools } from './event-services'
import { waitingListTools } from './waiting-list'

/**
 * Combined AI Tools Registry
 * All available tools for the AI assistant
 */
export const aiTools: ToolRegistry = {
  ...eventTools,
  ...clientTools,
  ...productTools,
  ...eventProductTools,
  ...serviceProviderTools,
  ...eventServiceTools,
  ...waitingListTools,
}

/**
 * Get all tool definitions for GPT-4
 */
export function getAllTools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return Object.values(aiTools).map((tool) => tool.tool)
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  userId: string,
  args: any
): Promise<any> {
  const tool = aiTools[toolName]
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`)
  }
  return tool.execute(userId, args)
}

/**
 * Get tool metadata by name
 */
export function getToolMetadata(toolName: string): ToolMetadata | undefined {
  return aiTools[toolName]
}

// Re-export types
export type { ToolMetadata, ToolRegistry } from './types'
