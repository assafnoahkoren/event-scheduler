// Activity message rendering utilities

// Type for message data structures
export interface EventMessageData {
  title: string
  client?: string
}

// Message type configuration
export type MessageTypeConfig = {
  translationKey: string
  parseData: (messageData?: string | null) => any
}

// Message type map - maps messageType to translation key and data parser
export const messageTypeMap: Record<string, MessageTypeConfig> = {
  EVENT_CREATED: {
    translationKey: 'events.activity.create',
    parseData: (messageData) => {
      if (!messageData) return { title: 'Untitled Event' }
      const data: EventMessageData = JSON.parse(messageData)
      return { title: data.title }
    }
  },
  EVENT_CREATED_WITH_CLIENT: {
    translationKey: 'events.activity.createWithClient',
    parseData: (messageData) => {
      if (!messageData) return { title: 'Untitled Event', client: '' }
      const data: EventMessageData = JSON.parse(messageData)
      return { title: data.title, client: data.client }
    }
  },
  EVENT_UPDATED: {
    translationKey: 'events.activity.edit',
    parseData: (messageData) => {
      if (!messageData) return { title: 'Untitled Event' }
      const data: EventMessageData = JSON.parse(messageData)
      return { title: data.title }
    }
  },
  EVENT_UPDATED_WITH_CLIENT: {
    translationKey: 'events.activity.editWithClient',
    parseData: (messageData) => {
      if (!messageData) return { title: 'Untitled Event', client: '' }
      const data: EventMessageData = JSON.parse(messageData)
      return { title: data.title, client: data.client }
    }
  },
  EVENT_DELETED: {
    translationKey: 'events.activity.delete',
    parseData: (messageData) => {
      if (!messageData) return { title: 'Untitled Event' }
      const data: EventMessageData = JSON.parse(messageData)
      return { title: data.title }
    }
  },
  EVENT_DELETED_WITH_CLIENT: {
    translationKey: 'events.activity.deleteWithClient',
    parseData: (messageData) => {
      if (!messageData) return { title: 'Untitled Event', client: '' }
      const data: EventMessageData = JSON.parse(messageData)
      return { title: data.title, client: data.client }
    }
  },
  CLIENT_CREATED: {
    translationKey: 'clients.activity.create',
    parseData: (messageData) => messageData ? JSON.parse(messageData) : {}
  },
  CLIENT_UPDATED: {
    translationKey: 'clients.activity.edit',
    parseData: (messageData) => messageData ? JSON.parse(messageData) : {}
  },
  CLIENT_DELETED: {
    translationKey: 'clients.activity.delete',
    parseData: (messageData) => messageData ? JSON.parse(messageData) : {}
  },
  SERVICE_PROVIDER_CREATED: {
    translationKey: 'providers.activity.create',
    parseData: (messageData) => messageData ? JSON.parse(messageData) : {}
  },
  SERVICE_PROVIDER_UPDATED: {
    translationKey: 'providers.activity.edit',
    parseData: (messageData) => messageData ? JSON.parse(messageData) : {}
  },
  SERVICE_PROVIDER_DELETED: {
    translationKey: 'providers.activity.delete',
    parseData: (messageData) => messageData ? JSON.parse(messageData) : {}
  },
}

/**
 * Renders an activity message using the message type and data
 * @param messageType - The type of message (from ActivityMessage enum)
 * @param messageData - JSON string containing message parameters
 * @param t - i18next translation function
 * @returns Translated and formatted message string
 */
export const renderActivityMessage = (
  messageType: string | null | undefined,
  messageData: string | null | undefined,
  t: any
): string => {
  if (!messageType) return 'Unknown activity'

  const config = messageTypeMap[messageType]
  if (!config) return messageType

  try {
    const data = config.parseData(messageData)
    return t(config.translationKey, data)
  } catch (error) {
    console.error('Error rendering activity message:', error)
    return messageType
  }
}
