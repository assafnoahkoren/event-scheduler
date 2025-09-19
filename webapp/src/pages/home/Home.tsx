import { CreateFirstSite } from './CreateFirstSite'
import { EventCalendar } from '@/components/EventCalendar'
import { DraftEvents } from '@/components/DraftEvents'
import { UpcomingEvents } from '@/components/UpcomingEvents'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'

export function Home() {
  const { currentSite } = useCurrentSite()

  return (
    <>
      {currentSite ? (
        <div className="space-y-0">
          <EventCalendar />
          <DraftEvents />
          <UpcomingEvents />
        </div>
      ) : (
        <CreateFirstSite />
      )}
    </>
  )
}