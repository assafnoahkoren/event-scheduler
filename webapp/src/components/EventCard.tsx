import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, MapPinIcon, UserIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Event = RouterOutput['events']['list'][0]

interface EventCardProps {
  event: Event
  onClick?: () => void
}

export function EventCard({ event, onClick }: EventCardProps) {
  const { t } = useTranslation()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-blue-100 text-blue-800'
      case 'SCHEDULED':
        return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return t('events.draft')
      case 'SCHEDULED':
        return t('events.scheduled')
      case 'IN_PROGRESS':
        return t('events.inProgress')
      case 'COMPLETED':
        return t('events.completed')
      case 'CANCELLED':
        return t('events.cancelled')
      default:
        return status
    }
  }

  return (
    <div
      onClick={onClick}
      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-lg">
          {event.title || t('events.untitledEvent')}
        </h3>
        <Badge className={cn("ml-2", getStatusColor(event.status))}>
          {getStatusLabel(event.status)}
        </Badge>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          <span>
            {format(new Date(event.startDate), 'PPP')}
            {event.endDate && event.endDate !== event.startDate && (
              <> - {format(new Date(event.endDate), 'PPP')}</>
            )}
          </span>
        </div>

        {event.location && (
          <div className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4" />
            <span>{event.location}</span>
          </div>
        )}

        {event.client && (
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            <span>{event.client.name}</span>
          </div>
        )}

        {event.description && (
          <p className="mt-2 text-foreground line-clamp-2">
            {event.description}
          </p>
        )}
      </div>
    </div>
  )
}