import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'

export function Profile() {
  const { t } = useTranslation()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center">
        <div className="max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">{t('profile.title')}</h2>
          </div>
          <div className="space-y-4">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}