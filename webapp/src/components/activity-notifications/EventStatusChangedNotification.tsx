import { NotificationItem } from '@/components/notifications/NotificationItem'
import type { NotificationRenderContext } from './EventCreatedNotification'
import { CheckCircle2 } from 'lucide-react'

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
      icon={
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center ring-2 ring-background">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
        </div>
      }
    >
      {data?.client
        ? context.t('events.activity.statusChangeWithClient', { title: eventTitle, client: data.client, oldStatus, newStatus })
        : context.t('events.activity.statusChange', { title: eventTitle, oldStatus, newStatus })
      }
    </NotificationItem>
  )
}
