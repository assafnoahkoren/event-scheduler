import { useState, useEffect } from 'react'
import { X, Calendar, Settings, User, Plus, Home, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { cn } from '@/lib/utils'
import { useIsRtl } from '@/hooks/useIsRtl'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: sites } = trpc.sites.list.useQuery()
  const isRtl = useIsRtl()

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = document.getElementById('sidebar')
      const menuButton = document.getElementById('menu-button')
      if (
        isOpen &&
        sidebar &&
        !sidebar.contains(e.target as Node) &&
        !menuButton?.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  const handleNavigation = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        id="sidebar"
        className={cn(
          'fixed top-0 h-full bg-background z-50 transition-transform duration-300',
          'w-full md:w-64',
          isRtl ? 'right-0 border-l' : 'left-0 border-r',
          isOpen
            ? 'translate-x-0'
            : isRtl
              ? 'translate-x-full'
              : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Event Scheduler</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation('/')}
            >
              <Home className="h-4 w-4 me-2" />
              {t('navigation.home')}
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation('/')}
            >
              <Calendar className="h-4 w-4 me-2" />
              {t('navigation.calendar')}
            </Button>

            {sites && sites.length > 0 && (
              <>
                <div className="pt-4 pb-2">
                  <h3 className="text-sm font-medium text-muted-foreground px-2">
                    {t('sites.mySites')}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleNavigation('/sites/settings')}
                >
                  <Settings className="h-4 w-4 me-2" />
                  {t('sites.siteSettings')}
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation('/sites/create')}
            >
              <Plus className="h-4 w-4 me-2" />
              {t('sites.createSite')}
            </Button>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation('/profile')}
            >
              <User className="h-4 w-4 me-2" />
              {t('profile.title')}
            </Button>
            <div className="w-full">
              <LanguageSwitcher variant="sidebar" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}