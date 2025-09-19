import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { SiteSwitcher } from '@/components/sites/SiteSwitcher'
import { LogOut, Calendar } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CreateFirstSite } from './CreateFirstSite'
import { EventCalendar } from '@/components/EventCalendar'
import { DraftEvents } from '@/components/DraftEvents'
import { UpcomingEvents } from '@/components/UpcomingEvents'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'

export function Home() {
  const { logout } = useAuth()
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Failed to logout:', error)
    }
    // Navigation is handled in the logout function
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t('common.appName')}</h1>
            <div className="ms-4 ps-4 border-s">
              <SiteSwitcher />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 me-2" />
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto pb-8">
        {currentSite ? (
          <div className="space-y-0">
            <EventCalendar />
            <DraftEvents />
            <UpcomingEvents />
          </div>
        ) : (
          <CreateFirstSite />
        )}
      </main>
    </div>
  )
}