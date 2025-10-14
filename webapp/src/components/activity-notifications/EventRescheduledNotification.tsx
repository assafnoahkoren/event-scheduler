import { NotificationItem } from '@/components/notifications/NotificationItem'
import { format } from 'date-fns'
import type { NotificationRenderContext } from './EventCreatedNotification'
import { CalendarClock } from 'lucide-react'

export interface EventRescheduledData {
  title: string
  client?: string
  eventId: string
  oldDate: string
  newDate: string
}

export function EventRescheduledNotification(
  data: EventRescheduledData | null,
  context: NotificationRenderContext
) {
  const eventTitle = data?.title || 'Untitled Event'
  const oldDate = data?.oldDate ? format(new Date(data.oldDate), 'MM/dd/yyyy') : 'Unknown Date'
  const newDate = data?.newDate ? format(new Date(data.newDate), 'MM/dd/yyyy') : 'Unknown Date'

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
        <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center ring-2 ring-background">
          <CalendarClock className="h-4 w-4 text-orange-600" />
        </div>
      }
    >
      {data?.client
        ? context.t('events.activity.rescheduleWithClient', { title: eventTitle, client: data.client, oldDate, newDate })
        : context.t('events.activity.reschedule', { title: eventTitle, oldDate, newDate })
      }
    </NotificationItem>
  )
}
