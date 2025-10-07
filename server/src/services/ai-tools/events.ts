import { eventService, createEventSchema } from '../event.service'
import type { ToolRegistry } from './types'

/**
 * Event-related AI tools
 */
export const eventTools: ToolRegistry = {
  createEvent: {
    successMessage: 'Event created successfully',
    errorMessage: 'Failed to create event',
    tool: {
      type: 'function',
      function: {
        name: 'createEvent',
        description:
          'Create a new event/appointment for the user. Use this when the user wants to schedule, create, or add an event.',
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
              description:
                'Client ID if the event is for a specific client (optional)',
            },
            startDate: {
              type: 'string',
              description:
                'Event start date and time in ISO 8601 format (e.g., 2025-12-25T10:00:00Z)',
            },
            endDate: {
              type: 'string',
              description:
                'Event end date and time in ISO 8601 format (optional)',
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
    execute: async (userId: string, args: any) => {
      const validatedInput = createEventSchema.parse(args)
      return eventService.createEvent(userId, validatedInput)
    },
  },
}
