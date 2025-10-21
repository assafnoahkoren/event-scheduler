import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Virtuoso } from 'react-virtuoso'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { startOfToday, endOfMonth, addMonths, parseISO, format } from 'date-fns'
import { EventCard } from '@/components/EventCard'
import { useDateFormatter } from '@/hooks/useDateFormatter'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Event = RouterOutput['events']['list'][0]

interface EventGroup {
  date: string
  events: Event[]
}

export function EventsList() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const { formatDate } = useDateFormatter()

  // Fetch events for the next 6 months for endless scrolling
  const today = startOfToday()
  const endDate = endOfMonth(addMonths(today, 5))

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

  // Group events by date
  const groupedEvents = useMemo(() => {
    if (!eventsData) return []

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    // Filter and sort events
    const sortedEvents = eventsData
      .filter(event => {
        const eventDate = parseISO(event.startDate)
        return eventDate >= now
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

    // Group by date
    const groups: EventGroup[] = []
    let currentGroup: EventGroup | null = null

    sortedEvents.forEach(event => {
      const eventDate = parseISO(event.startDate)
      const dateKey = format(eventDate, 'yyyy-MM-dd')

      if (!currentGroup || currentGroup.date !== dateKey) {
        currentGroup = { date: dateKey, events: [] }
        groups.push(currentGroup)
      }

      currentGroup.events.push(event)
    })

    return groups
  }, [eventsData])

  // Flatten grouped events for Virtuoso
  const virtualItems = useMemo(() => {
    const items: Array<{ type: 'date' | 'event'; date?: string; event?: Event }> = []

    groupedEvents.forEach(group => {
      // Add date header
      items.push({ type: 'date', date: group.date })
      // Add events for this date
      group.events.forEach(event => {
        items.push({ type: 'event', event })
      })
    })

    return items
  }, [groupedEvents])

  if (!currentSite) {
    return null
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('common.loading')}
      </div>
    )
  }

  if (virtualItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('events.noEvents')}
      </div>
    )
  }

  return (
    <div className="w-full h-[calc(100vh-200px)]">
      <Virtuoso
        data={virtualItems}
        itemContent={(index, item) => {
          if (item.type === 'date') {
            const date = parseISO(item.date!)
            return (
              <div className={`sticky top-0 z-10 bg-muted backdrop-blur-sm py-3 px-4 border-b mb-8 ${index === 0 ? '' : 'mt-8'}`}>
                <h3 className="font-semibold text-sm">
                  {formatDate(date, 'EEEE, MMMM d, yyyy')}
                </h3>
              </div>
            )
          } else {
            return (
              <div className="px-4">
                <EventCard event={item.event!} />
              </div>
            )
          }
        }}
      />
    </div>
  )
}
