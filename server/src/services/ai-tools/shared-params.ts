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

  // Product parameters
  product: {
    siteId: {
      type: 'string' as const,
      description: 'Site ID where the product belongs',
    },
    name: {
      type: 'string' as const,
      description: 'Product name',
    },
    description: {
      type: 'string' as const,
      description: 'Product description (optional)',
    },
    type: {
      type: 'string' as const,
      enum: ['SERVICE', 'PHYSICAL', 'EXTERNAL_SERVICE'],
      description: 'Product type',
    },
    price: {
      type: 'number' as const,
      description: 'Product price',
    },
    currency: {
      type: 'string' as const,
      description: 'Currency code (e.g., USD, EUR, ILS)',
    },
    isActive: {
      type: 'boolean' as const,
      description: 'Whether the product is active (default: true)',
    },
  },

  // Event-Product parameters
  eventProduct: {
    eventId: {
      type: 'string' as const,
      description: 'Event ID',
    },
    productId: {
      type: 'string' as const,
      description: 'Product ID',
    },
    quantity: {
      type: 'number' as const,
      description: 'Quantity (default: 1)',
    },
    price: {
      type: 'number' as const,
      description: 'Price for this instance (can override product default price)',
    },
    currency: {
      type: 'string' as const,
      description: 'Currency (optional)',
    },
    notes: {
      type: 'string' as const,
      description: 'Additional notes (optional)',
    },
  },

  // Service Provider parameters
  serviceProvider: {
    organizationId: {
      type: 'string' as const,
      description: 'Organization ID where the service provider belongs',
    },
    name: {
      type: 'string' as const,
      description: 'Service provider name (company/person name)',
    },
    phone: {
      type: 'string' as const,
      description: 'Phone number (optional)',
    },
    email: {
      type: 'string' as const,
      description: 'Email address (optional)',
    },
    notes: {
      type: 'string' as const,
      description: 'Additional notes about the service provider (optional)',
    },
    categoryId: {
      type: 'string' as const,
      description: 'Category ID for this service provider (optional)',
    },
  },

  // Event-Service Provider parameters
  eventService: {
    eventId: {
      type: 'string' as const,
      description: 'Event ID',
    },
    providerId: {
      type: 'string' as const,
      description: 'Service provider ID',
    },
    providerServiceId: {
      type: 'string' as const,
      description: 'Specific service ID from the provider',
    },
    price: {
      type: 'number' as const,
      description: 'Agreed price (optional, uses service default if not specified)',
    },
    providerPrice: {
      type: 'number' as const,
      description: 'Provider cost (what they charge us)',
    },
    notes: {
      type: 'string' as const,
      description: 'Notes specific to this service on this event (optional)',
    },
    status: {
      type: 'string' as const,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
      description: 'Service status (default: PENDING)',
    },
    isPaid: {
      type: 'boolean' as const,
      description: 'Whether the provider has been paid (default: false)',
    },
    paymentNotes: {
      type: 'string' as const,
      description: 'Payment notes (optional)',
    },
  },

  // Waiting List parameters
  waitingList: {
    siteId: {
      type: 'string' as const,
      description: 'Site ID',
    },
    clientId: {
      type: 'string' as const,
      description: 'Client ID who is on the waiting list',
    },
    ruleType: {
      type: 'string' as const,
      enum: ['SPECIFIC_DATES', 'DAY_OF_WEEK', 'DATE_RANGE'],
      description: 'Type of date rule (specific dates, days of week, or date range)',
    },
    specificDates: {
      type: 'array' as const,
      items: {
        type: 'string' as const,
      },
      description: 'Array of specific dates (for SPECIFIC_DATES type)',
    },
    daysOfWeek: {
      type: 'array' as const,
      items: {
        type: 'number' as const,
      },
      description: 'Array of weekday numbers 0-6 (for DAY_OF_WEEK type, 0=Sunday, 6=Saturday)',
    },
    dateRange: {
      type: 'object' as const,
      properties: {
        start: {
          type: 'string' as const,
          description: 'Start date',
        },
        end: {
          type: 'string' as const,
          description: 'End date',
        },
      },
      description: 'Date range object (for DATE_RANGE type)',
    },
    expirationDate: {
      type: 'string' as const,
      description: 'When this waiting list entry expires (ISO 8601 datetime)',
    },
    notes: {
      type: 'string' as const,
      description: 'Additional notes or special requests (optional)',
    },
    createdBy: {
      type: 'string' as const,
      description: 'User ID who created this entry',
    },
    status: {
      type: 'string' as const,
      enum: ['PENDING', 'FULFILLED', 'EXPIRED', 'CANCELLED'],
      description: 'Waiting list entry status',
    },
    eventId: {
      type: 'string' as const,
      description: 'Event ID if this request was fulfilled (optional)',
    },
  },
}
