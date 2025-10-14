// Activity message rendering utilities
import { NotificationItem } from '@/components/notifications/NotificationItem'
import type { ReactNode } from 'react'

// Type for message data structures
export interface EventMessageData {
  title: string
  client?: string
}

export interface ClientMessageData {
  name: string
}

export interface ServiceProviderMessageData {
  name: string
}

// Render context passed to render functions
export interface RenderContext {
  activityId: string
  userName: string
  userAvatarUrl?: string | null
  activityType: string
  activityTypeColor: string
  isUnread: boolean
  eventTitle?: string | null
  createdAt: Date
  t: any
}

// Message type configuration
export type MessageTypeConfig = {
  render: (data: any, context: RenderContext) => ReactNode
}

// Message type map - maps messageType to render function
export const messageTypeMap: Record<string, MessageTypeConfig> = {
  EVENT_CREATED: {
    render: (data: EventMessageData, context: RenderContext) => (
      <NotificationItem
        activityId={context.activityId}
        userName={context.userName}
        userAvatarUrl={context.userAvatarUrl}
        activityType={context.activityType}
        activityTypeColor={context.activityTypeColor}
        isUnread={context.isUnread}
        eventTitle={context.eventTitle}
        createdAt={context.createdAt}
      >
        {context.t('events.activity.create', { title: data?.title || 'Untitled Event' })}
      </NotificationItem>
    ),
  },
}

/**
 * Renders an activity notification using the message type and data
 * @param messageType - The type of message (from ActivityMessage enum)
 * @param data - JSON data containing message parameters (already parsed from DB)
 * @param context - Render context with user info, translations, etc.
 * @returns React component for the notification
 */
export const renderActivityNotification = (
  messageType: string | null | undefined,
  data: any,
  context: RenderContext
): ReactNode => {
  if (!messageType) {
    return (
      <NotificationItem
        activityId={context.activityId}
        userName={context.userName}
        userAvatarUrl={context.userAvatarUrl}
        activityType={context.activityType}
        activityTypeColor={context.activityTypeColor}
        isUnread={context.isUnread}
        eventTitle={context.eventTitle}
        createdAt={context.createdAt}
      >
        Unknown activity
      </NotificationItem>
    )
  }

  const config = messageTypeMap[messageType]
  if (!config) {
    return (
      <NotificationItem
        activityId={context.activityId}
        userName={context.userName}
        userAvatarUrl={context.userAvatarUrl}
        activityType={context.activityType}
        activityTypeColor={context.activityTypeColor}
        isUnread={context.isUnread}
        eventTitle={context.eventTitle}
        createdAt={context.createdAt}
      >
        {messageType}
      </NotificationItem>
    )
  }

  try {
    return config.render(data, context)
  } catch (error) {
    console.error('Error rendering activity notification:', error)
    return (
      <NotificationItem
        activityId={context.activityId}
        userName={context.userName}
        userAvatarUrl={context.userAvatarUrl}
        activityType={context.activityType}
        activityTypeColor={context.activityTypeColor}
        isUnread={context.isUnread}
        eventTitle={context.eventTitle}
        createdAt={context.createdAt}
      >
        {messageType}
      </NotificationItem>
    )
  }
}
