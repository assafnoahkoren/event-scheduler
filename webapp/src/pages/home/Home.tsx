import { CreateFirstSite } from './CreateFirstSite'
import { CreateFirstOrg } from './CreateFirstOrg'
import { EventCalendar } from '@/components/EventCalendar'
import { DraftEvents } from '@/components/DraftEvents'
import { UpcomingEvents } from '@/components/UpcomingEvents'
import { EventsList } from '@/components/EventsList'
import { WaitingListMatchNotification } from '@/components/WaitingListMatchNotification'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { usePersistentState } from '@/hooks/usePersistentState'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ViewMode = 'grid' | 'list'

export function Home() {
  const { t } = useTranslation()
  const { currentOrg, isLoading: orgLoading } = useCurrentOrg()
  const { currentSite } = useCurrentSite()
  const [viewMode, setViewMode] = usePersistentState<ViewMode>('home-view-mode', 'grid')

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
          <div className="flex w-full gap-2 p-4">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
              aria-label={t('common.gridView')}
              className="flex-1"
            >
              <LayoutGrid className="h-4 w-4 me-2" />
              {t('common.grid')}
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              aria-label={t('common.listView')}
              className="flex-1"
            >
              <List className="h-4 w-4 me-2" />
              {t('common.list')}
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