import { useParams } from 'react-router-dom'
import { trpc } from '@/utils/trpc'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

export function Event() {
  const { eventId } = useParams<{ eventId: string }>()
  const { t } = useTranslation()

  const { data: event, isLoading, error } = trpc.events.get.useQuery(
    { id: eventId || '' },
    { enabled: !!eventId }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="py-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-red-600 mb-2">
            {error ? 'Error loading event' : 'Event not found'}
          </h1>
          {error && (
            <p className="text-muted-foreground">{error.message}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm">
          <h1 className="text-3xl font-bold mb-4">
            {event.title || t('events.untitledEvent')}
          </h1>

          <div className="text-lg text-muted-foreground">
            {format(new Date(event.startDate), 'PPPP')}
          </div>
        </div>
      </div>
    </div>
  )
}