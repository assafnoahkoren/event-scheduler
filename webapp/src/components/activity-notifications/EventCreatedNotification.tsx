import { NotificationItem } from '@/components/notifications/NotificationItem'
import { format } from 'date-fns'
import { CalendarPlus } from 'lucide-react'

export interface EventCreatedData {
  title: string
  client?: string
  eventId?: string
  startDate: string
}

export interface NotificationRenderContext {
  activityId: string
  userName: string
  userAvatarUrl?: string | null
  isUnread: boolean
  createdAt: Date
  onClose?: () => void
  onNavigate?: (path: string) => void
  t: any
}

export function EventCreatedNotification(
  data: EventCreatedData | null,
  context: NotificationRenderContext
) {
  const eventTitle = data?.title || 'Untitled Event'
  const eventDate = data?.startDate ? format(new Date(data.startDate), 'MM/dd/yyyy') : 'Unknown Date'

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
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center ring-2 ring-background">
          <CalendarPlus className="h-4 w-4 text-green-600" />
        </div>
      }
    >
      {data?.client
        ? context.t('events.activity.createWithClient', { title: eventTitle, client: data.client, eventDate })
        : context.t('events.activity.create', { title: eventTitle, eventDate })
      }
    </NotificationItem>
  )
}
