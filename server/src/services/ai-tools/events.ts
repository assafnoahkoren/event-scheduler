import { eventService, createEventSchema, updateEventSchema, getEventsSchema } from '../event.service'
import type { ToolRegistry } from './types'
import { sharedParams } from './shared-params'

/**
 * Event-related AI tools
 */
export const eventTools: ToolRegistry = {
  searchEvents: {
    successMessage: 'Events found',
    errorMessage: 'Failed to search events',
    tool: {
      type: 'function',
      function: {
        name: 'searchEvents',
        description:
          'Search and list events. Use this to find events by date range, client, status, or to get all events for a site. Always use this before updating or deleting an event if you only have the event name/description.',
        parameters: {
          type: 'object',
          properties: {
            siteId: {
              type: 'string',
              description: 'Site ID to search events in (required)',
            },
            startDate: {
              type: 'string',
              description: 'Filter events starting from this date (ISO 8601 format, optional)',
            },
            endDate: {
              type: 'string',
              description: 'Filter events up to this date (ISO 8601 format, optional)',
            },
            clientId: {
              type: 'string',
              description: 'Filter events for a specific client (optional)',
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'SCHEDULED', 'CANCELLED'],
              description: 'Filter events by status (optional)',
            },
          },
          required: ['siteId'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const validatedInput = getEventsSchema.parse(args)
      return eventService.getEvents(userId, validatedInput)
    },
  },


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
          properties: sharedParams.event,
          required: ['siteId', 'startDate'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const validatedInput = createEventSchema.parse(args)
      return eventService.createEvent(userId, validatedInput)
    },
  },

  updateEvent: {
    successMessage: 'Event updated successfully',
    errorMessage: 'Failed to update event',
    tool: {
      type: 'function',
      function: {
        name: 'updateEvent',
        description:
          'Update an existing event. Use this when the user wants to modify, change, or update event details.',
        parameters: {
          type: 'object',
          properties: {
            ...sharedParams.common,
            ...sharedParams.event,
          },
          required: ['id'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const validatedInput = updateEventSchema.parse(args)
      return eventService.updateEvent(userId, validatedInput)
    },
  },

  deleteEvent: {
    successMessage: 'Event deleted successfully',
    errorMessage: 'Failed to delete event',
    dangerous: true,
    tool: {
      type: 'function',
      function: {
        name: 'deleteEvent',
        description:
          'Delete an event. Use this when the user wants to remove, cancel, or delete an event permanently.',
        parameters: {
          type: 'object',
          properties: sharedParams.common,
          required: ['id'],
        },
      },
    },
    execute: async (userId: string, args: any) => {
      const { id } = args
      return eventService.deleteEvent(userId, id)
    },
  },
}
