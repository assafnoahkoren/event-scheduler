import { useState } from 'react'
import { CreateFirstSite } from './CreateFirstSite'
import { CreateFirstOrg } from './CreateFirstOrg'
import { EventCalendar } from '@/components/EventCalendar'
import { DraftEvents } from '@/components/DraftEvents'
import { UpcomingEvents } from '@/components/UpcomingEvents'
import { EventsList } from '@/components/EventsList'
import { WaitingListMatchNotification } from '@/components/WaitingListMatchNotification'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ViewMode = 'grid' | 'list'

export function Home() {
  const { currentOrg, isLoading: orgLoading } = useCurrentOrg()
  const { currentSite } = useCurrentSite()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

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

          {/* View toggle buttons */}
          <div className="flex justify-start gap-2 p-4">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {viewMode === 'grid' ? (
            <>
              <DraftEvents />
              <UpcomingEvents />
            </>
          ) : (
            <EventsList />
          )}
        </div>
      ) : (
        <CreateFirstSite />
      )}
    </>
  )
}