import { eventProviderService, type AddEventProviderInput, type UpdateEventProviderInput } from '../event-provider.service'
import type { ToolRegistry } from './types'
import { sharedParams } from './shared-params'

/**
 * Event-Service Provider relationship AI tools
 */
export const eventServiceTools: ToolRegistry = {
  addServiceToEvent: {
    successMessage: 'Service provider added to event successfully',
    errorMessage: 'Failed to add service provider to event',
    tool: {
      type: 'function',
      function: {
        name: 'addServiceToEvent',
        description:
          'Assign a service provider to work on an event (photographer, caterer, DJ, etc.). Use this when user wants to book a service provider for an event.',
        parameters: {
          type: 'object',
          properties: sharedParams.eventService,
          required: ['eventId', 'providerId', 'providerServiceId'],
        },
      },
    },
    execute: async (_userId: string, args: AddEventProviderInput) => {
      return eventProviderService.addEventProvider(args)
    },
  },

  updateEventService: {
    successMessage: 'Event service updated successfully',
    errorMessage: 'Failed to update event service',
    tool: {
      type: 'function',
      function: {
        name: 'updateEventService',
        description:
          'Update service provider details for an event (price, status, notes). Use this when user wants to modify service provider assignment.',
        parameters: {
          type: 'object',
          properties: {
            ...sharedParams.common,
            ...sharedParams.eventService,
          },
          required: ['id'],
        },
      },
    },
    execute: async (_userId: string, args: UpdateEventProviderInput) => {
      return eventProviderService.updateEventProvider(args)
    },
  },

  removeServiceFromEvent: {
    successMessage: 'Service provider removed from event successfully',
    errorMessage: 'Failed to remove service provider from event',
    tool: {
      type: 'function',
      function: {
        name: 'removeServiceFromEvent',
        description:
          'Remove a service provider from an event. Use this when user wants to cancel or unassign a service provider.',
        parameters: {
          type: 'object',
          properties: sharedParams.common,
          required: ['id'],
        },
      },
    },
    execute: async (_userId: string, args: { id: string }) => {
      await eventProviderService.removeEventProvider(args)
      return { message: 'Service provider removed from event' }
    },
  },
}
