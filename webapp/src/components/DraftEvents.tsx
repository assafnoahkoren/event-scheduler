import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { startOfToday, endOfMonth, addMonths, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EventCard } from '@/components/EventCard'

export function DraftEvents() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()

  // Fetch events for the next 3 months
  const today = startOfToday()
  const endDate = endOfMonth(addMonths(today, 2))

  const { data: eventsData, isLoading } = trpc.events.list.useQuery(
    {
      siteId: currentSite?.id || '',
      startDate: today.toISOString(),
      endDate: endDate.toISOString(),
    },
    {
      enabled: !!currentSite?.id,
    }
  )

  // Filter only draft events
  const draftEvents = useMemo(() => {
    if (!eventsData) return []

    return eventsData
      .filter(event => event.status === 'DRAFT')
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 10) // Show max 10 draft events
  }, [eventsData])

  if (!currentSite) {
    return null
  }

  // Don't show the section if there are no drafts
  if (!isLoading && draftEvents.length === 0) {
    return null
  }

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader>
        <CardTitle>{t('events.draftEvents')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : (
          <div className="space-y-4">
            {draftEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => console.log('Draft event clicked:', event)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}