import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { SiteSwitcher } from '@/components/sites/SiteSwitcher'
import { User, ArrowLeft, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function Header() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const isEventPage = location.pathname.startsWith('/event/')

  const handleProfile = () => {
    navigate('/profile')
  }

  const handleSettings = () => {
    navigate('/sites/settings')
  }

  const handleBack = () => {
    navigate('/')
  }

  return (
    <>
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isEventPage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="me-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="border-e pe-4 flex items-center gap-2">
              <SiteSwitcher />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSettings}
                title={t('navigation.settings')}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleProfile}
              title={t('profile.title')}
            >
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
    </>
  )
}