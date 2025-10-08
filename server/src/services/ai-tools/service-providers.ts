import { serviceProviderService, type CreateServiceProviderInput, type UpdateServiceProviderInput } from '../service-provider.service'
import type { ToolRegistry } from './types'
import { sharedParams } from './shared-params'

/**
 * Service Provider AI tools
 */
export const serviceProviderTools: ToolRegistry = {
  searchServiceProviders: {
    successMessage: 'Service providers found',
    errorMessage: 'Failed to search service providers',
    tool: {
      type: 'function',
      function: {
        name: 'searchServiceProviders',
        description:
          'Search and list service providers by name, email, or phone. Use this to find service providers before updating or deleting them.',
        parameters: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'Organization ID to search service providers in (required)',
            },
            query: {
              type: 'string',
              description: 'Search query to filter by name, email, or phone (optional)',
            },
          },
          required: ['organizationId'],
        },
      },
    },
    execute: async (_userId: string, args: any) => {
      const { organizationId, query } = args
      return serviceProviderService.listServiceProviders(organizationId, query, false)
    },
  },

  createServiceProvider: {
    successMessage: 'Service provider created successfully',
    errorMessage: 'Failed to create service provider',
    tool: {
      type: 'function',
      function: {
        name: 'createServiceProvider',
        description:
          'Create a new service provider (photographer, caterer, DJ, etc.). Use this when user wants to add a new service provider.',
        parameters: {
          type: 'object',
          properties: sharedParams.serviceProvider,
          required: ['organizationId', 'name'],
        },
      },
    },
    execute: async (_userId: string, args: CreateServiceProviderInput) => {
      return serviceProviderService.createServiceProvider(args)
    },
  },

  updateServiceProvider: {
    successMessage: 'Service provider updated successfully',
    errorMessage: 'Failed to update service provider',
    tool: {
      type: 'function',
      function: {
        name: 'updateServiceProvider',
        description:
          'Update an existing service provider details. Use this when user wants to modify provider information.',
        parameters: {
          type: 'object',
          properties: {
            ...sharedParams.common,
            ...sharedParams.serviceProvider,
          },
          required: ['id'],
        },
      },
    },
    execute: async (_userId: string, args: any) => {
      const { id, ...updateData } = args
      return serviceProviderService.updateServiceProvider(id, updateData as UpdateServiceProviderInput)
    },
  },

  deleteServiceProvider: {
    successMessage: 'Service provider deleted successfully',
    errorMessage: 'Failed to delete service provider',
    tool: {
      type: 'function',
      function: {
        name: 'deleteServiceProvider',
        description:
          'Delete a service provider. Use this when user wants to remove a service provider from the system.',
        parameters: {
          type: 'object',
          properties: sharedParams.common,
          required: ['id'],
        },
      },
    },
    execute: async (_userId: string, args: any) => {
      await serviceProviderService.deleteServiceProvider(args.id)
      return { message: 'Service provider deleted successfully' }
    },
  },
}
