import { CreateFirstSite } from './CreateFirstSite'
import { CreateFirstOrg } from './CreateFirstOrg'
import { EventCalendar } from '@/components/EventCalendar'
import { DraftEvents } from '@/components/DraftEvents'
import { UpcomingEvents } from '@/components/UpcomingEvents'
import { WaitingListMatchNotification } from '@/components/WaitingListMatchNotification'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'

export function Home() {
  const { currentOrg, isLoading: orgLoading } = useCurrentOrg()
  const { currentSite } = useCurrentSite()

  // Show loading state while checking for organization
  if (orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  // Check for organization first
  if (!currentOrg) {
    return <CreateFirstOrg />
  }

  // Then check for site
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