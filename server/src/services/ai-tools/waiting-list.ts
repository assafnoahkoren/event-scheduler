import {
  createWaitingListEntry,
  updateWaitingListEntry,
  listWaitingListEntries,
  deleteWaitingListEntry,
  type CreateWaitingListEntryInput,
  type UpdateWaitingListEntryInput,
  type ListWaitingListEntriesInput,
} from '../waiting-list/waiting-list.service'
import type { ToolRegistry } from './types'
import { sharedParams } from './shared-params'

/**
 * Waiting List AI tools
 */
export const waitingListTools: ToolRegistry = {
  searchWaitingList: {
    successMessage: 'Waiting list entries found',
    errorMessage: 'Failed to search waiting list',
    tool: {
      type: 'function',
      function: {
        name: 'searchWaitingList',
        description:
          'Search waiting list entries for a site or specific client. Use this to find waiting list requests.',
        parameters: {
          type: 'object',
          properties: {
            siteId: {
              type: 'string',
              description: 'Site ID to search waiting list in (required)',
            },
            clientId: {
              type: 'string',
              description: 'Filter by specific client (optional)',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'FULFILLED', 'EXPIRED', 'CANCELLED'],
              description: 'Filter by status (optional)',
            },
          },
          required: ['siteId'],
        },
      },
    },
    execute: async (_userId: string, args: ListWaitingListEntriesInput) => {
      return listWaitingListEntries(args)
    },
  },

  createWaitingListEntry: {
    successMessage: 'Client added to waiting list successfully',
    errorMessage: 'Failed to add client to waiting list',
    tool: {
      type: 'function',
      function: {
        name: 'createWaitingListEntry',
        description:
          'Add a client to the waiting list for specific dates or date ranges. Use this when client wants to be notified about available dates.',
        parameters: {
          type: 'object',
          properties: sharedParams.waitingList,
          required: ['siteId', 'clientId', 'ruleType', 'expirationDate', 'createdBy'],
        },
      },
    },
    execute: async (_userId: string, args: CreateWaitingListEntryInput) => {
      return createWaitingListEntry(args)
    },
  },

  updateWaitingListEntry: {
    successMessage: 'Waiting list entry updated successfully',
    errorMessage: 'Failed to update waiting list entry',
    tool: {
      type: 'function',
      function: {
        name: 'updateWaitingListEntry',
        description:
          'Update a waiting list entry (dates, status, notes). Use this when user wants to modify a waiting list request.',
        parameters: {
          type: 'object',
          properties: {
            ...sharedParams.common,
            ...sharedParams.waitingList,
          },
          required: ['id'],
        },
      },
    },
    execute: async (_userId: string, args: UpdateWaitingListEntryInput) => {
      return updateWaitingListEntry(args)
    },
  },

  deleteWaitingListEntry: {
    successMessage: 'Waiting list entry deleted successfully',
    errorMessage: 'Failed to delete waiting list entry',
    dangerous: true,
    tool: {
      type: 'function',
      function: {
        name: 'deleteWaitingListEntry',
        description:
          'Delete/cancel a waiting list entry. Use this when user wants to remove a client from the waiting list.',
        parameters: {
          type: 'object',
          properties: sharedParams.common,
          required: ['id'],
        },
      },
    },
    execute: async (_userId: string, args: { id: string }) => {
      await deleteWaitingListEntry(args.id)
      return { message: 'Waiting list entry deleted successfully' }
    },
  },
}
