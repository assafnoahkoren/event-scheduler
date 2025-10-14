// Activity message rendering utilities
import { NotificationItem } from '@/components/notifications/NotificationItem'
import type { ReactNode } from 'react'
import { EventCreatedNotification } from '@/components/activity-notifications/EventCreatedNotification'
import { EventDeletedNotification } from '@/components/activity-notifications/EventDeletedNotification'
import { EventRescheduledNotification } from '@/components/activity-notifications/EventRescheduledNotification'
import { EventStatusChangedNotification } from '@/components/activity-notifications/EventStatusChangedNotification'

// Render context passed to render functions
export interface RenderContext {
  activityId: string
  userName: string
  userAvatarUrl?: string | null
  isUnread: boolean
  createdAt: Date
  onClose?: () => void
  onNavigate?: (path: string) => void
  t: any
}

// Message type configuration
export type MessageTypeConfig = {
  render: (data: any, context: RenderContext) => ReactNode
}

// Message type map - maps messageType to render function
export const messageTypeMap: Record<string, MessageTypeConfig> = {
  EVENT_CREATED: {
    render: EventCreatedNotification,
  },
  EVENT_DELETED: {
    render: EventDeletedNotification,
  },
  EVENT_RESCHEDULED: {
    render: EventRescheduledNotification,
  },
  EVENT_STATUS_CHANGED: {
    render: EventStatusChangedNotification,
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
        isUnread={context.isUnread}
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
        isUnread={context.isUnread}
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
        isUnread={context.isUnread}
        createdAt={context.createdAt}
      >
        {messageType}
      </NotificationItem>
    )
  }
}
