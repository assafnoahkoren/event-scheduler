import { NotificationItem } from '@/components/notifications/NotificationItem'
import type { NotificationRenderContext } from './EventCreatedNotification'
import { Trash2 } from 'lucide-react'

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
      icon={
        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center ring-2 ring-background">
          <Trash2 className="h-4 w-4 text-red-600" />
        </div>
      }
    >
      {data?.client
        ? context.t('events.activity.deleteWithClient', { title: eventTitle, client: data.client })
        : context.t('events.activity.delete', { title: eventTitle })
      }
    </NotificationItem>
  )
}
