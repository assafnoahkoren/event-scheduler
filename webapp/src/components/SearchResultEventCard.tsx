import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useDateFormatter } from '@/hooks/useDateFormatter'
import { useTranslation } from 'react-i18next'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Event = RouterOutput['events']['list'][0]

interface SearchResultEventCardProps {
  event: Event
  onClick: () => void
}

const STATUS_DOT: Record<string, string> = {
  DRAFT: 'bg-blue-400',
  SCHEDULED: 'bg-green-400',
  CANCELLED: 'bg-red-400',
}

export function SearchResultEventCard({ event, onClick }: SearchResultEventCardProps) {
  const { t } = useTranslation()
  const { formatTime, locale } = useDateFormatter()

  const startDate = new Date(event.startDate)
  const month = format(startDate, 'MMM', { locale })
  const day = format(startDate, 'd', { locale })

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 active:bg-accent cursor-pointer min-h-[56px] transition-colors"
    >
      {/* Date column */}
      <div className="w-10 text-center shrink-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none mb-0.5">
          {month}
        </p>
        <p className="text-xl font-bold leading-none">{day}</p>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-border shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate leading-snug">
          {event.title || t('events.untitledEvent')}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {formatTime(event.startDate)}
          {event.client && ` · ${event.client.name}`}
        </p>
      </div>

      {/* Status dot */}
      <div className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[event.status] ?? 'bg-gray-400')} />
    </div>
  )
}
