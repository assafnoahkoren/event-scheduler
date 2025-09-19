import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { format, startOfToday, endOfMonth, addMonths, isAfter, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EventCard } from '@/components/EventCard'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

export function UpcomingEvents() {
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


  // Sort and filter upcoming events (excluding drafts)
  const upcomingEvents = useMemo(() => {
    if (!eventsData) return []

    return eventsData
      .filter(event => {
        // Exclude draft events
        if (event.status === 'DRAFT') return false

        const eventDate = parseISO(event.startDate)
        return isAfter(eventDate, today) || format(eventDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 10) // Show max 10 upcoming events
  }, [eventsData])

  if (!currentSite) {
    return null
  }

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader>
        <CardTitle>{t('events.upcomingEvents')}</CardTitle>
      </CardHeader>
      <CardContent className='px-0'>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('events.noEvents')}
          </div>
        ) : (
          <Swiper
            modules={[Pagination]}
            spaceBetween={0}
            slidesPerView={1.3}
            pagination={{ clickable: true }}
            breakpoints={{
              640: {
                slidesPerView: 1.3,
                spaceBetween: 16,
              },
              768: {
                slidesPerView: 2.3,
                spaceBetween: 16,
              },
              1024: {
                slidesPerView: 2.3,
                spaceBetween: 20,
              },
            }}
            className="!pb-10"
          >
            {upcomingEvents.reduce((slides, event, index) => {
              if (index % 2 === 0) {
                slides.push(
                  <SwiperSlide key={`slide-${index}`}>
                    <div className="space-y-4 ms-4">
                      <EventCard
                        event={event}
                      />
                      {upcomingEvents[index + 1] && (
                        <EventCard
                          event={upcomingEvents[index + 1]}
                        />
                      )}
                    </div>
                  </SwiperSlide>
                )
              }
              return slides
            }, [] as React.ReactElement[])}
          </Swiper>
        )}
      </CardContent>
    </Card>
  )
}