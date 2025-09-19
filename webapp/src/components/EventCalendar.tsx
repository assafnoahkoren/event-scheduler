import { useState, useMemo } from 'react'
import { SimpleCalendar } from '@/components/SimpleCalendar'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function EventCalendar() {
  const { i18n, t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [viewMonth, setViewMonth] = useState(new Date())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState<Date>(new Date())

  const utils = trpc.useUtils()

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

  // Create event mutation
  const createEventMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch events
      utils.events.list.invalidate()
      // Close dialog and reset form
      setIsDialogOpen(false)
      setEventTitle('')
    },
    onError: (error) => {
      console.error('Failed to create event:', error)
      // TODO: Show error toast
    }
  })

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

  // Handle date selection from calendar
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Check if there are existing events on this date
      const dateKey = format(date, 'yyyy-MM-dd')
      const existingEvents = eventsByDate.get(dateKey)

      if (existingEvents && existingEvents.length > 0) {
        // If events exist, log them for now
        console.log(`Events on ${dateKey}:`, existingEvents)
        // TODO: Show event list or edit dialog
      } else {
        // No events, open creation dialog
        setEventDate(date)
        setEventTitle('')
        setIsDialogOpen(true)
      }
    }
    // Don't set selected date to avoid focus styling
  }

  // Handle event creation
  const handleCreateEvent = () => {
    if (!currentSite?.id || !eventTitle.trim()) return

    createEventMutation.mutate({
      siteId: currentSite.id,
      title: eventTitle.trim(),
      startDate: eventDate.toISOString(),
      endDate: eventDate.toISOString(), // Same as start date for now
      status: 'DRAFT' as const,
    })
  }

  // Custom cell render function
  const renderCell = (date: Date, { isSelected, isCurrentMonth, isToday, hasEvent }: {
    isSelected: boolean
    isCurrentMonth: boolean
    isToday: boolean
    hasEvent: boolean
  }) => {
    const dayEvents = eventsByDate.get(format(date, 'yyyy-MM-dd')) || []
    const eventCount = dayEvents.length

    // Check if any events are drafts
    const hasDraftEvent = dayEvents.some(event => event.status === 'DRAFT')
    const hasScheduledEvent = dayEvents.some(event => event.status !== 'DRAFT')

    return (
      <div className={cn(
        "relative h-full w-full min-h-[20px] flex items-center justify-center text-sm rounded-md transition-colors",
        {
          // Blue for draft events, green for scheduled/other events
          "bg-blue-100 hover:bg-blue-200": hasDraftEvent && isCurrentMonth,
          "bg-green-100 hover:bg-green-200": !hasDraftEvent && hasScheduledEvent && isCurrentMonth,
          "text-muted-foreground": !isCurrentMonth,
          "hover:bg-accent hover:text-accent-foreground": !hasEvent && isCurrentMonth,
        }
      )}>
        <span className={cn(
          "text-center text-lg flex items-center justify-center w-10 h-10 rounded-full",
          {
            "font-bold border-2 border-blue-500": isToday,
            "text-blue-800": hasDraftEvent && isCurrentMonth,
            "text-green-800": !hasDraftEvent && hasScheduledEvent && isCurrentMonth,
            "text-primary": isToday && !hasEvent,
          }
        )}>
          {format(date, 'd')}
        </span>
      </div>
    )
  }

  if (!currentSite) {
    return null
  }

  return (
    <>
      <div className="flex justify-center items-flex-start min-h-[524px] pt-8">
        <div className="max-w-2xl w-md">
          <SimpleCalendar
            selected={selectedDate}
            onSelect={handleDateSelect}
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

      {/* Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('events.createEvent')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                {t('events.eventTitle')}
              </Label>
              <Input
                id="title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="col-span-3"
                placeholder={t('events.eventTitle')}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                {t('events.startDate')}
              </Label>
              <Input
                id="date"
                type="date"
                value={format(eventDate, 'yyyy-MM-dd')}
                onChange={(e) => setEventDate(new Date(e.target.value))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={createEventMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={!eventTitle.trim() || createEventMutation.isPending}
            >
              {createEventMutation.isPending ? t('common.loading') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}