import { useState, useMemo } from 'react'
import { SimpleCalendar } from '@/components/SimpleCalendar'
import { ProfitChart } from '@/components/ProfitChart'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { cn } from '@/lib/utils'
import { navigateToEvent } from '@/utils/navigation'
import { useLongPress } from 'use-long-press'
import { useSwipeable } from 'react-swipeable'
import { useUrlMonth } from '@/hooks/useUrlMonth'
import { useIsRtl } from '@/hooks/useIsRtl'
import { CalendarClock } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { EventForm, type EventFormData } from '@/components/EventForm'
import { EventCard } from '@/components/EventCard'
import { useDateFormatter } from '@/hooks/useDateFormatter'

export function EventCalendar() {
  const { i18n, t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const navigate = useNavigate()
  const { formatFullDate } = useDateFormatter()
  const isRTL = useIsRtl()
  const [viewMonth, setViewMonth] = useUrlMonth()

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [eventDate, setEventDate] = useState<Date>(new Date())
  const [isEventsListOpen, setIsEventsListOpen] = useState(false)
  const [selectedDateEvents, setSelectedDateEvents] = useState<any[]>([])

  const utils = trpc.useUtils()

  // Handle swipe gestures for month navigation
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      // Next month (right direction in LTR, left in RTL)
      if (isRTL) {
        setViewMonth(prev => subMonths(prev, 1))
      } else {
        setViewMonth(prev => addMonths(prev, 1))
      }
    },
    onSwipedRight: () => {
      // Previous month (left direction in LTR, right in RTL)
      if (isRTL) {
        setViewMonth(prev => addMonths(prev, 1))
      } else {
        setViewMonth(prev => subMonths(prev, 1))
      }
    },
    trackMouse: false, // Only track touch events, not mouse
    preventScrollOnSwipe: true, // Prevent scrolling during swipe
    delta: 50, // Minimum distance for a swipe to be registered
  })

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
      if (event.status === 'CANCELLED') return
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
        if (existingEvents.length === 1) {
          // Single event, navigate directly
          navigateToEvent(navigate, existingEvents[0].id)
        } else {
          // Multiple events, show list drawer
          setSelectedDateEvents(existingEvents)
          setIsEventsListOpen(true)
        }
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
      type: formData.type,
      title: formData.title,
      description: formData.description,
      startDate: formData.startDate.toISOString(),
      endDate: formData.endDate?.toISOString(),
      isAllDay: formData.isAllDay,
      clientId: formData.clientId || undefined,
      status: formData.status || 'SCHEDULED',
    })
  }

  // Calendar cell component to properly use hooks
  const CalendarCell = ({ date, isSelected, isCurrentMonth, isToday }: {
    date: Date
    isSelected: boolean
    isCurrentMonth: boolean
    isToday: boolean
  }) => {
    const dayEvents = eventsByDate.get(format(date, 'yyyy-MM-dd')) || []
    const hasDraftEvent = dayEvents.some(event => event.status === 'DRAFT')
    const hasScheduledEvent = dayEvents.some(event => event.status !== 'DRAFT')
    const hasPreEventMeeting = dayEvents.some(event => event.type === 'PRE_EVENT_MEETING')
    const eventCount = dayEvents.length

    // Handle click events manually to avoid mobile scroll interference
    const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
      // Prevent if it's part of a scroll gesture
      if ('touches' in e && e.touches.length > 1) return

      // Only handle if it's current month
      if (isCurrentMonth) {
        handleDateSelect(date)
      }
    }

    // Use the long press hook
    const longPressHandlers = useLongPress(
      () => {
        // Long press callback - always open event creation
        if (isCurrentMonth) {
          setEventDate(date)
          setIsDialogOpen(true)
        }
      },
      {
        onCancel: () => {
          // Don't handle single click here - let the onClick handle it
          // This prevents scroll gestures from triggering clicks
        },
        threshold: 500, // 500ms for long press
        cancelOnMovement: true,
      }
    )

    return (
      <div
        className={cn(
          "h-full w-full flex items-center justify-center relative p-1",
          // Background colors for events (only if not PRE_EVENT_MEETING)
          !hasPreEventMeeting && hasDraftEvent && isCurrentMonth && "bg-blue-100 hover:bg-blue-200",
          !hasPreEventMeeting && !hasDraftEvent && hasScheduledEvent && isCurrentMonth && "bg-green-100 hover:bg-green-200",
          // Disabled styling
          !isCurrentMonth && "text-gray-400",
          // Add cursor pointer for interactive cells
          isCurrentMonth && "cursor-pointer select-none"
        )}
        {...(isCurrentMonth ? longPressHandlers() : {})}
        onClick={isCurrentMonth ? handleClick : undefined}
      >
        <span className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full pointer-events-none",
          // Today styling - border instead of background
          isToday && "bg-blue-500 text-white",
        )}>
          {format(date, 'd')}
        </span>
        {hasPreEventMeeting && isCurrentMonth && (
          <CalendarClock className="absolute top-0.5 inset-x-0 mx-auto w-4 h-4 text-purple-600 pointer-events-none" />
        )}
        {eventCount > 1 && isCurrentMonth && (
          <span className="absolute bottom-0.5 text-xs font-medium text-gray-600 pointer-events-none">
            ({eventCount})
          </span>
        )}
      </div>
    )
  }

  // Custom cell render function
  const renderCell = (date: Date, { isSelected, isCurrentMonth, isToday, hasEvent }: {
    isSelected: boolean
    isCurrentMonth: boolean
    isToday: boolean
    hasEvent: boolean
  }) => {
    return (
      <CalendarCell
        date={date}
        isSelected={isSelected}
        isCurrentMonth={isCurrentMonth}
        isToday={isToday}
      />
    )
  }

  if (!currentSite) {
    return null
  }

  return (
    <>
      <div className="flex justify-center items-flex-start min-h-[500px] bg-slate-50">
        <div className="max-w-2xl w-full" {...swipeHandlers}>
          {/* Profit Chart */}
          {/* <div className="mb-4 bg-background p-2">
            <ProfitChart
              startDate={format(startOfMonth(viewMonth), 'yyyy-MM-dd')}
              endDate={format(endOfMonth(viewMonth), 'yyyy-MM-dd')}
            />
          </div> */}

          {/* Calendar */}
          <SimpleCalendar
            selected={selectedDate}
            onSelect={handleDateSelect}
            month={viewMonth}
            onMonthChange={setViewMonth}
            dir={isRTL ? 'rtl' : 'ltr'}
            disabled={isLoading}
            modifiers={{
              hasEvents: daysWithEvents,
            }}
            renderCell={renderCell}
          />
        </div>
      </div>

      {/* Event Creation Drawer */}
      <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('events.createEvent')}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <EventForm
              initialDate={eventDate}
              onSubmit={handleCreateEvent}
              onCancel={() => setIsDialogOpen(false)}
              isSubmitting={createEventMutation.isPending}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Events List Drawer */}
      <Drawer open={isEventsListOpen} onOpenChange={setIsEventsListOpen}>
        <DrawerContent halfScreen>
          <DrawerHeader>
            <DrawerTitle>
              {selectedDateEvents.length > 0 &&
                formatFullDate(new Date(selectedDateEvents[0].startDate))
              } - {selectedDateEvents.length} {t('events.events')}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-8 pt-4">
              {selectedDateEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => {
                    setIsEventsListOpen(false)
                    navigateToEvent(navigate, event.id)
                  }}
                />
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}