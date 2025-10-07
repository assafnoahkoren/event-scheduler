import { clientService, createClientSchema } from '../client.service'
import type { ToolRegistry } from './types'

/**
 * Client-related AI tools
 */
export const clientTools: ToolRegistry = {
  createClient: {
    successMessage: 'Client added successfully',
    errorMessage: 'Failed to add client',
    tool: {
      type: 'function',
      function: {
        name: 'createClient',
        description:
          'Create a new client/customer for the organization. Use this when the user wants to add a new client.',
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
    execute: async (userId: string, args: any) => {
      const validatedInput = createClientSchema.parse(args)
      return clientService.createClient(userId, validatedInput)
    },
  },
}
