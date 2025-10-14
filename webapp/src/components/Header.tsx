import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/Sidebar'
import { SiteSwitcher } from '@/components/sites/SiteSwitcher'
import { NotificationsDrawer } from '@/components/notifications/NotificationsDrawer'
import { ArrowLeft, ArrowRight, Menu, Home, Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useIsRtl } from '@/hooks/useIsRtl'
import { trpc } from '@/utils/trpc'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'

export function Header() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const isRtl = useIsRtl()
  const { currentOrg } = useCurrentOrg()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const { data: sites } = trpc.sites.list.useQuery()
  const { data: unviewedCount } = trpc.userActivity.getUnviewedCount.useQuery(
    { organizationId: currentOrg?.id || '' },
    { enabled: !!currentOrg?.id }
  )

  // Always show back button
  const showBackButton = true
  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  const handleBack = () => {
    // If there's history, go back, otherwise go home
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <NotificationsDrawer
        open={isNotificationsOpen}
        onOpenChange={setIsNotificationsOpen}
      />
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="container mx-auto px-2 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <Button
              id="menu-button"
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={t('common.menu')}
            >
              <Menu className="h-4 w-4" />
            </Button>
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                title={t('common.back')}
              >
                <BackIcon className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              title={t('navigation.home')}
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNotificationsOpen(true)}
              title="Notifications"
              className="relative top-[1px]"
            >
              <Bell className="h-4 w-4" />
              {unviewedCount && unviewedCount.count > 0 && (
                <span className="absolute top-1 end-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unviewedCount.count > 99 ? '99+' : unviewedCount.count}
                </span>
              )}
            </Button>
          </div>

          <div className="flex-1"></div>

          <div className="flex items-center">
            {sites && sites.length > 0 && (
              <SiteSwitcher />
            )}
          </div>
        </div>
      </header>
    </>
  )
}