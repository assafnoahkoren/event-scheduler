import { NotificationItem } from '@/components/notifications/NotificationItem'
import type { NotificationRenderContext } from './EventCreatedNotification'

export interface EventStatusChangedData {
  title: string
  client?: string
  eventId: string
  oldStatus: string
  newStatus: string
}

export function EventStatusChangedNotification(
  data: EventStatusChangedData | null,
  context: NotificationRenderContext
) {
  const eventTitle = data?.title || 'Untitled Event'
  const oldStatus = data?.oldStatus || 'Unknown'
  const newStatus = data?.newStatus || 'Unknown'

  return (
    <NotificationItem
      activityId={context.activityId}
      userName={context.userName}
      userAvatarUrl={context.userAvatarUrl}
      isUnread={context.isUnread}
      createdAt={context.createdAt}
      onClick={data?.eventId && context.onNavigate ? () => context.onNavigate!(`/event/${data.eventId}`) : undefined}
      onClose={context.onClose}
    >
      {data?.client
        ? context.t('events.activity.statusChangeWithClient', { title: eventTitle, client: data.client, oldStatus, newStatus })
        : context.t('events.activity.statusChange', { title: eventTitle, oldStatus, newStatus })
      }
    </NotificationItem>
  )
}
