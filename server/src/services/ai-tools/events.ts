import { eventService, createEventSchema, updateEventSchema } from '../event.service'
import type { ToolRegistry } from './types'
import { sharedParams } from './shared-params'

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
