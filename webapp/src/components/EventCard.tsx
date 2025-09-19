import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { UserIcon, Phone, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { navigateToEvent } from '@/utils/navigation'
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
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      navigateToEvent(navigate, event.id)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-blue-100 text-blue-800'
      case 'SCHEDULED':
        return 'bg-green-100 text-green-800'
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
      case 'CANCELLED':
        return t('events.cancelled')
      default:
        return status
    }
  }

  const hasPhone = !!event.client?.phone

  return (
    <div className="relative mt-3">
      {/* Floating status badge */}
      <Badge
        className={cn(
          "absolute -top-3 start-3 z-10 text-xs",
          getStatusColor(event.status)
        )}
      >
        {getStatusLabel(event.status)}
      </Badge>

      <div className="border rounded-lg overflow-hidden hover:bg-accent/50 transition-colors">
        <div className="flex">
          {/* Main content area */}
          <div
            onClick={handleClick}
            className="flex-1 p-3 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(event.startDate), 'MM/dd')}
              </div>
              <h3 className="font-medium truncate">
                {event.title || t('events.untitledEvent')}
              </h3>
            </div>

            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
              <div className="flex items-center gap-1">
                <UserIcon className="w-3 h-3" />
                <span className="truncate">
                  {event.client ? event.client.name : t('clients.noClient')}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons - full height */}
          {hasPhone && (
            <div className="flex" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => window.location.href = `tel:${event.client!.phone}`}
                className="px-3 bg-blue-50 hover:bg-blue-100 border-s flex items-center justify-center transition-colors"
                title={t('clients.phoneCall')}
              >
                <Phone className="h-4 w-4 text-blue-600" />
              </button>
              <button
                onClick={() => {
                  const phoneNumber = event.client!.phone!.replace(/\D/g, '')
                  window.open(`https://wa.me/${phoneNumber}`, '_blank')
                }}
                className="px-3 bg-green-50 hover:bg-green-100 border-s flex items-center justify-center transition-colors"
                title={t('clients.whatsappMessage')}
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}