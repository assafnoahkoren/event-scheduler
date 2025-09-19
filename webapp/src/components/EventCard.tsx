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
      className="border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {format(new Date(event.startDate), 'MM/dd')}
          </div>
          <h3 className="font-medium truncate">
            {event.title || t('events.untitledEvent')}
          </h3>
        </div>
        <Badge className={cn("text-xs", getStatusColor(event.status))}>
          {getStatusLabel(event.status)}
        </Badge>
      </div>

      {(event.location || event.client) && (
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPinIcon className="w-3 h-3" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          {event.client && (
            <div className="flex items-center gap-1">
              <UserIcon className="w-3 h-3" />
              <span className="truncate">{event.client.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}