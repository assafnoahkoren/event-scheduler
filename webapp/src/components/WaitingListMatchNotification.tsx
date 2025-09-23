import { useEffect, useState } from 'react'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { useNavigate } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import { Bell, Calendar, User, Phone, MessageCircle, Clock, CalendarPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormatLongDateWithDay, useFormatRelativeTime } from '@/hooks/useDateFormatter'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { EventForm, type EventFormData } from '@/components/EventForm'
import 'swiper/css'
import 'swiper/css/pagination'
import './WaitingListMatchNotification.css'

interface WaitingListEntry {
  id: string
  clientId: string
  client: {
    id: string
    name: string
    phone?: string | null
  }
}

interface WaitingListMatch {
  entry: WaitingListEntry
  matchingDates: string[] // Dates come as ISO strings from the API
}

interface WaitingListMatchCardProps {
  entry: WaitingListEntry
  date: Date
  onClick: () => void
  onConvertToEvent: (entry: WaitingListEntry, date: Date) => void
}

function WaitingListMatchCard({ entry, date, onClick, onConvertToEvent }: WaitingListMatchCardProps) {
  const { t } = useTranslation()
  const formatLongDateWithDay = useFormatLongDateWithDay()
  const formatRelativeTime = useFormatRelativeTime()
  const hasPhone = !!entry.client?.phone

  return (
    <div className="bg-white rounded-md overflow-hidden shadow-none mx-4">
      <div className="flex">
        {/* Main content area */}
        <div
          onClick={onClick}
          className="flex-1 min-w-0 p-2 cursor-pointer"
        >
          {/* Client name row */}
          <div className="flex items-center gap-2 mb-1">
            <User className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <div className="font-medium text-sm text-gray-900 truncate">
              {entry.client.name}
            </div>
          </div>

          {/* Date information row */}
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-500" />
              <span className="truncate">{formatLongDateWithDay(date)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="whitespace-nowrap">{formatRelativeTime(date)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons - full height */}
        <div className="flex" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onConvertToEvent(entry, date)}
            className="px-2 bg-purple-50 hover:bg-purple-100 border-s flex items-center justify-center transition-colors"
            title={t('events.createEvent')}
          >
            <CalendarPlus className="h-4 w-4 text-purple-600" />
          </button>
          {hasPhone && (
            <>
              <button
                onClick={() => window.location.href = `tel:${entry.client.phone}`}
                className="px-2 bg-blue-50 hover:bg-blue-100 border-s flex items-center justify-center transition-colors"
                title={t('clients.phoneCall')}
              >
                <Phone className="h-4 w-4 text-blue-600" />
              </button>
              <button
                onClick={() => {
                  const phoneNumber = entry.client.phone!.replace(/\D/g, '')
                  window.open(`https://wa.me/${phoneNumber}`, '_blank')
                }}
                className="px-2 bg-green-50 hover:bg-green-100 border-s flex items-center justify-center transition-colors"
                title={t('clients.whatsappMessage')}
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function WaitingListMatchNotification() {
  const { currentSite } = useCurrentSite()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const utils = trpc.useUtils()

  // Event creation drawer state
  const [isEventDrawerOpen, setIsEventDrawerOpen] = useState(false)
  const [eventDate, setEventDate] = useState<Date>(new Date())
  const [eventClientId, setEventClientId] = useState<string | null>(null)
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)

  // Fetch matches when component mounts
  const { data: matchesData, refetch } = trpc.waitingList.checkAllMatches.useQuery(
    {
      siteId: currentSite?.id || ''
    },
    {
      enabled: !!currentSite,
      refetchOnMount: true,
      refetchOnWindowFocus: false
    }
  )

  // Update waiting list entry mutation
  const updateWaitingListMutation = trpc.waitingList.update.useMutation({
    onSuccess: () => {
      // Refetch waiting list data to update the UI
      refetch()
      // Navigate to the calendar/home page
      navigate('/')
    },
    onError: (error: any) => {
      console.error('Failed to update waiting list entry:', error)
    }
  })

  // Create event mutation - must be before conditional returns
  const createEventMutation = trpc.events.create.useMutation({
    onSuccess: (data) => {
      // Invalidate and refetch events
      utils.events.list.invalidate()
      // Close dialog
      setIsEventDrawerOpen(false)

      // Mark the waiting list entry as fulfilled
      if (currentEntryId && data?.id) {
        updateWaitingListMutation.mutate({
          id: currentEntryId,
          status: 'FULFILLED',
          eventId: data.id,
          fulfilledAt: new Date().toISOString()
        })
      }
    },
    onError: (error) => {
      console.error('Failed to create event:', error)
    }
  })

  // Refetch when site changes
  useEffect(() => {
    if (currentSite) {
      refetch()
    }
  }, [currentSite, refetch])

  // Handler functions
  const handleSlideClick = (entryId: string) => {
    navigate('/waiting-list')
  }

  const handleConvertToEvent = (entry: WaitingListEntry, date: Date) => {
    setEventDate(date)
    setEventClientId(entry.clientId)
    setCurrentEntryId(entry.id)
    setIsEventDrawerOpen(true)
  }

  const handleCreateEvent = (formData: EventFormData) => {
    if (!currentSite?.id) return

    createEventMutation.mutate({
      siteId: currentSite.id,
      title: formData.title,
      description: formData.description,
      startDate: formData.startDate.toISOString(),
      endDate: formData.endDate?.toISOString(),
      isAllDay: formData.isAllDay,
      clientId: formData.clientId || undefined,
      status: formData.status || 'SCHEDULED',
    })
  }

  // Don't render if no matches
  if (!matchesData?.matches || matchesData.matches.length === 0) {
    return null
  }

  // Flatten all matches with their dates and filter for future dates only (excluding today)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0) // Start of tomorrow

  const allMatches: Array<{ entry: WaitingListEntry, date: Date }> = []
  matchesData.matches.forEach((match: WaitingListMatch) => {
    match.matchingDates.forEach((date) => {
      const matchDate = new Date(date)
      // Only include future dates (tomorrow or later, excluding today)
      if (matchDate >= tomorrow) {
        allMatches.push({
          entry: match.entry,
          date: matchDate
        })
      }
    })
  })

  // Sort by date
  allMatches.sort((a, b) => a.date.getTime() - b.date.getTime())

  if (allMatches.length === 0) {
    return null
  }

  return (
    <>
      <div className="bg-red-100 pt-3">
      <div className="flex items-center gap-2 mb-2 mx-3">
        <Bell className="h-4 w-4 text-red-600" />
        <span className="text-sm font-medium text-red-900">
          {t('waitingList.matchesAvailable')}
        </span>
      </div>

      <div className="relative">
        <Swiper
          modules={[Autoplay, Pagination]}
          spaceBetween={10}
          slidesPerView={1}
          pagination={{ clickable: true }}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          breakpoints={{
            640: {
              slidesPerView: 2,
            },
            768: {
              slidesPerView: 3,
            },
            1024: {
              slidesPerView: 4,
            },
          }}
          className={`waiting-list-swiper ${allMatches.length > 1 ? '!pb-8' : '!pb-4'}`}
        >
          {allMatches.map((match, index) => (
            <SwiperSlide key={`${match.entry.id}-${match.date.toISOString()}-${index}`}>
              <WaitingListMatchCard
                entry={match.entry}
                date={match.date}
                onClick={() => handleSlideClick(match.entry.id)}
                onConvertToEvent={handleConvertToEvent}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>

    {/* Event Creation Drawer */}
    <Drawer open={isEventDrawerOpen} onOpenChange={setIsEventDrawerOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('events.createEvent')}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4">
          <EventForm
            initialDate={eventDate}
            initialClientId={eventClientId}
            onSubmit={handleCreateEvent}
            onCancel={() => setIsEventDrawerOpen(false)}
            isSubmitting={createEventMutation.isPending}
          />
        </div>
      </DrawerContent>
    </Drawer>
    </>
  )
}