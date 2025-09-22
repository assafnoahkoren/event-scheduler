import { useEffect } from 'react'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { useNavigate } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import { Bell, Calendar, User, Phone, MessageCircle, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormatLongDateWithDay, useFormatRelativeTime } from '@/hooks/useDateFormatter'
import 'swiper/css'
import 'swiper/css/pagination'
import './WaitingListMatchNotification.css'

interface WaitingListEntry {
  id: string
  client: {
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
}

function WaitingListMatchCard({ entry, date, onClick }: WaitingListMatchCardProps) {
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
        {hasPhone && (
          <div className="flex" onClick={(e) => e.stopPropagation()}>
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
          </div>
        )}
      </div>
    </div>
  )
}

export function WaitingListMatchNotification() {
  const { currentSite } = useCurrentSite()
  const navigate = useNavigate()
  const { t } = useTranslation()

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

  // Refetch when site changes
  useEffect(() => {
    if (currentSite) {
      refetch()
    }
  }, [currentSite, refetch])

  // Don't render if no matches
  if (!matchesData?.matches || matchesData.matches.length === 0) {
    return null
  }

  const handleSlideClick = (entryId: string) => {
    navigate('/waiting-list')
  }

  // Flatten all matches with their dates
  const allMatches: Array<{ entry: WaitingListEntry, date: Date }> = []
  matchesData.matches.forEach((match: WaitingListMatch) => {
    match.matchingDates.forEach((date) => {
      allMatches.push({
        entry: match.entry,
        date: new Date(date)
      })
    })
  })

  // Sort by date
  allMatches.sort((a, b) => a.date.getTime() - b.date.getTime())

  if (allMatches.length === 0) {
    return null
  }

  return (
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
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  )
}