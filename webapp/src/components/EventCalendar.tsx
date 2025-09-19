import { useState, useMemo } from 'react'
import { SimpleCalendar } from '@/components/SimpleCalendar'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'
import { navigateToEvent } from '@/utils/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EventForm, type EventFormData } from '@/components/EventForm'

export function EventCalendar() {
  const { i18n, t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [viewMonth, setViewMonth] = useState(new Date())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
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
      // Close dialog
      setIsDialogOpen(false)
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
        // If events exist, navigate to the first event
        navigateToEvent(navigate, existingEvents[0].id)
      } else {
        // No events, open creation dialog
        setEventDate(date)
        setIsDialogOpen(true)
      }
    }
    setSelectedDate(date)
  }

  // Handle event creation
  const handleCreateEvent = (formData: EventFormData) => {
    if (!currentSite?.id) return

    createEventMutation.mutate({
      siteId: currentSite.id,
      title: formData.title,
      description: formData.description,
      location: formData.location,
      startDate: formData.startDate.toISOString(),
      endDate: formData.endDate?.toISOString(),
      isAllDay: formData.isAllDay,
      clientId: formData.clientId || undefined,
      status: 'DRAFT' as const,
    })
  }

  // Custom cell render function
  const renderCell = (date: Date, { isSelected, isCurrentMonth, isToday }: {
    isSelected: boolean
    isCurrentMonth: boolean
    isToday: boolean
    hasEvent: boolean
  }) => {
    const dayEvents = eventsByDate.get(format(date, 'yyyy-MM-dd')) || []

    // Check if any events are drafts
    const hasDraftEvent = dayEvents.some(event => event.status === 'DRAFT')
    const hasScheduledEvent = dayEvents.some(event => event.status !== 'DRAFT')

    return (
      <div
        className={cn(
          "h-full w-full flex items-center justify-center relative p-1",
          // Background colors for events
          hasDraftEvent && isCurrentMonth && "bg-blue-100 hover:bg-blue-200",
          !hasDraftEvent && hasScheduledEvent && isCurrentMonth && "bg-green-100 hover:bg-green-200",
          // Disabled styling
          !isCurrentMonth && "text-gray-400"
        )}
      >
        <span className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full",
          // Today styling - border instead of background
          isToday && "border-2 border-blue-500",
          // Selected styling
          isSelected && !isToday && "bg-primary text-primary-foreground"
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
      <div className="flex justify-center items-flex-start min-h-[524px] pt-8 bg-slate-50">
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
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{t('events.createEvent')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <EventForm
              initialDate={eventDate}
              onSubmit={handleCreateEvent}
              onCancel={() => setIsDialogOpen(false)}
              isSubmitting={createEventMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}