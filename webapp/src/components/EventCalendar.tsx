import { useState, useMemo } from 'react'
import { SimpleCalendar } from '@/components/SimpleCalendar'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'

export function EventCalendar() {
  const { i18n } = useTranslation()
  const { currentSite } = useCurrentSite()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [viewMonth, setViewMonth] = useState(new Date())

  // Fetch events for the current month
  const { data: eventsData, isLoading } = trpc.events.list.useQuery(
    {
      siteId: currentSite?.id || '',
      startDate: startOfMonth(viewMonth).toISOString(),
      endDate: endOfMonth(viewMonth).toISOString(),
    },
    {
      enabled: !!currentSite?.id,
    }
  )

  // Group events by date
  const eventsByDate = useMemo(() => {
    if (!eventsData) return new Map<string, any[]>()

    const grouped = new Map<string, any[]>()
    eventsData.forEach((event: any) => {
      const dateKey = format(new Date(event.startDate), 'yyyy-MM-dd')
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      grouped.get(dateKey)?.push(event)
    })
    return grouped
  }, [eventsData])

  // Days with events (for calendar marking)
  const daysWithEvents = useMemo(() => {
    return Array.from(eventsByDate.keys()).map(dateStr => new Date(dateStr))
  }, [eventsByDate])

  // Custom cell render function
  const renderCell = (date: Date, { isSelected, isCurrentMonth, isToday, hasEvent }: {
    isSelected: boolean
    isCurrentMonth: boolean
    isToday: boolean
    hasEvent: boolean
  }) => {
    const dayEvents = eventsByDate.get(format(date, 'yyyy-MM-dd')) || []
    const eventCount = dayEvents.length

    return (
      <div className={cn(
        "relative h-full w-full min-h-[20px] flex flex-col items-center justify-center text-sm",
        "hover:bg-accent hover:text-accent-foreground rounded-md transition-colors",
        {
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground": isSelected,
          "font-bold": isToday,
          "text-muted-foreground": !isCurrentMonth,
        }
      )}>
        <span className={cn(
          "text-center text-lg",
          isToday && !isSelected && "text-primary"
        )}>
          {format(date, 'd')}
        </span>

        {/* Event indicators */}
        {hasEvent && isCurrentMonth && (
          <div className="flex gap-0.5 mt-1">
            {eventCount <= 3 ? (
              // Show individual dots for up to 3 events
              Array.from({ length: eventCount }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 w-1 rounded-full bg-primary"
                  style={{ backgroundColor: isSelected ? 'white' : undefined }}
                />
              ))
            ) : (
              // Show number for more than 3 events
              <span className={cn(
                "text-xs font-bold",
                isSelected ? "text-primary-foreground" : "text-primary"
              )}>
                {eventCount}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  if (!currentSite) {
    return null
  }

  return (
    <div className="flex justify-center items-flex-start min-h-[524px] pt-8">
      <div className="max-w-2xl w-md">
        <SimpleCalendar
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={viewMonth}
          onMonthChange={setViewMonth}
          dir={i18n.language === 'ar' || i18n.language === 'he' ? 'rtl' : 'ltr'}
          disabled={isLoading}
          modifiers={{
            hasEvents: daysWithEvents,
          }}
          renderCell={renderCell}
        />
      </div>
    </div>
  )
}