import { NotificationItem } from '@/components/notifications/NotificationItem'
import type { NotificationRenderContext } from './EventCreatedNotification'

export interface EventDeletedData {
  title: string
  client?: string
  eventId: string
}

export function EventDeletedNotification(
  data: EventDeletedData | null,
  context: NotificationRenderContext
) {
  const eventTitle = data?.title || 'Untitled Event'

  return (
    <NotificationItem
      activityId={context.activityId}
      userName={context.userName}
      userAvatarUrl={context.userAvatarUrl}
      isUnread={context.isUnread}
      createdAt={context.createdAt}
      onClose={context.onClose}
    >
      {data?.client
        ? context.t('events.activity.deleteWithClient', { title: eventTitle, client: data.client })
        : context.t('events.activity.delete', { title: eventTitle })
      }
    </NotificationItem>
  )
}
