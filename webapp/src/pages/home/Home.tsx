import { CreateFirstSite } from './CreateFirstSite'
import { EventCalendar } from '@/components/EventCalendar'
import { DraftEvents } from '@/components/DraftEvents'
import { UpcomingEvents } from '@/components/UpcomingEvents'
import { WaitingListMatchNotification } from '@/components/WaitingListMatchNotification'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'

export function Home() {
  const { currentSite } = useCurrentSite()

  return (
    <>
      {currentSite ? (
        <div className="space-y-0">
          <WaitingListMatchNotification />
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