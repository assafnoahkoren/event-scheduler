import { clientService, createClientSchema, updateClientSchema, searchClientsSchema } from '../client.service'
import type { ToolRegistry } from './types'
import { sharedParams } from './shared-params'

/**
 * Client-related AI tools
 */
export const clientTools: ToolRegistry = {
  searchClients: {
    successMessage: 'Clients found',
    errorMessage: 'Failed to search clients',
    tool: {
      type: 'function',
      function: {
        name: 'searchClients',
        description:
          'Search and list clients by name. Use this to find clients before updating or deleting them, or to look up client information.',
        parameters: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'Organization ID to search clients in (required)',
            },
            query: {
              type: 'string',
              description: 'Search query to filter clients by name (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10, max: 50)',
            },
          },
          required: ['organizationId'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const validatedInput = searchClientsSchema.parse(args)
      return clientService.searchClients(userId, validatedInput)
    },
  },


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
          properties: sharedParams.client,
          required: ['organizationId', 'name'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const validatedInput = createClientSchema.parse(args)
      return clientService.createClient(userId, validatedInput)
    },
  },

  updateClient: {
    successMessage: 'Client updated successfully',
    errorMessage: 'Failed to update client',
    tool: {
      type: 'function',
      function: {
        name: 'updateClient',
        description:
          'Update an existing client. Use this when the user wants to modify, change, or update client information.',
        parameters: {
          type: 'object',
          properties: {
            ...sharedParams.common,
            ...sharedParams.client,
          },
          required: ['id'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const validatedInput = updateClientSchema.parse(args)
      return clientService.updateClient(userId, validatedInput)
    },
  },

  deleteClient: {
    successMessage: 'Client deleted successfully',
    errorMessage: 'Failed to delete client',
    dangerous: true,
    tool: {
      type: 'function',
      function: {
        name: 'deleteClient',
        description:
          'Delete a client. Use this when the user wants to remove or delete a client permanently.',
        parameters: {
          type: 'object',
          properties: sharedParams.common,
          required: ['id'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const { id } = args
      return clientService.deleteClient(userId, id)
    },
  },
}
