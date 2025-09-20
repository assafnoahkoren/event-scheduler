import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/Sidebar'
import { SiteSwitcher } from '@/components/sites/SiteSwitcher'
import { ArrowLeft, ArrowRight, Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useIsRtl } from '@/hooks/useIsRtl'
import { trpc } from '@/utils/trpc'

export function Header() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const isRtl = useIsRtl()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { data: sites } = trpc.sites.list.useQuery()

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
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="container mx-auto px-2 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <Button
              id="menu-button"
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="me-2"
              title={t('common.menu')}
            >
              <Menu className="h-4 w-4" />
            </Button>
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="me-2"
                title={t('common.back')}
              >
                <BackIcon className="h-4 w-4" />
              </Button>
            )}
          </div>

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