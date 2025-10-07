/**
 * Shared parameter definitions for AI tools
 * Reduces duplication across tool definitions
 */

export const sharedParams = {
  // Event parameters
  event: {
    siteId: {
      type: 'string' as const,
      description: 'Site ID where the event will be created',
    },
    title: {
      type: 'string' as const,
      description: 'Event title or name (optional)',
    },
    description: {
      type: 'string' as const,
      description: 'Event description (optional)',
    },
    location: {
      type: 'string' as const,
      description: 'Event location/venue (optional)',
    },
    clientId: {
      type: 'string' as const,
      description: 'Client ID if the event is for a specific client (optional)',
    },
    startDate: {
      type: 'string' as const,
      description: 'Event start date and time in ISO 8601 format (e.g., 2025-12-25T10:00:00Z)',
    },
    endDate: {
      type: 'string' as const,
      description: 'Event end date and time in ISO 8601 format (optional)',
    },
    timezone: {
      type: 'string' as const,
      description: 'Event timezone (default: UTC)',
    },
    isAllDay: {
      type: 'boolean' as const,
      description: 'Whether this is an all-day event (default: false)',
    },
    status: {
      type: 'string' as const,
      enum: ['DRAFT', 'SCHEDULED', 'CANCELLED'],
      description: 'Event status (default: DRAFT)',
    },
  },

  // Client parameters
  client: {
    organizationId: {
      type: 'string' as const,
      description: 'Organization ID where the client will be created',
    },
    name: {
      type: 'string' as const,
      description: 'Client full name',
    },
    email: {
      type: 'string' as const,
      description: 'Client email address (optional)',
    },
    phone: {
      type: 'string' as const,
      description: 'Client phone number (optional)',
    },
    address: {
      type: 'string' as const,
      description: 'Client address (optional)',
    },
    notes: {
      type: 'string' as const,
      description: 'Additional notes about the client (optional)',
    },
    isActive: {
      type: 'boolean' as const,
      description: 'Whether the client is active (optional)',
    },
  },

  // Common parameters
  common: {
    id: {
      type: 'string' as const,
      description: 'Record ID',
    },
  },
}
