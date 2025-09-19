import { useState } from 'react'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Check, ChevronDown, Building2, Users, Calendar, Loader2, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function SiteSwitcher() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentSite, sites, switchSite, isLoading } = useCurrentSite()
  const [dialogOpen, setDialogOpen] = useState(false)

  // Show loader while fetching sites
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin opacity-50" />
        <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
      </div>
    )
  }

  // Don't show switcher if no sites
  if (!currentSite || sites.length === 0) {
    return null
  }

  const handleSelectSite = (siteId: string) => {
    switchSite(siteId)
    setDialogOpen(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        className="gap-2 px-3"
        onClick={() => setDialogOpen(true)}
      >
        <Building2 className="h-4 w-4" />
        <span className="max-w-[150px] truncate">{currentSite.name}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('sites.switchSite')}</DialogTitle>
            <DialogDescription>
              {t('sites.switchSiteDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-4">
            {sites.map((site) => (
              <Card
                key={site.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-accent ${
                  currentSite.id === site.id ? 'border-primary bg-accent' : ''
                }`}
                onClick={() => handleSelectSite(site.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{site.name}</h3>
                      {currentSite.id === site.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{site._count.siteUsers}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{site._count.events}</span>
                      </div>
                      {site.userRole && (
                        <span className="text-xs bg-primary/10 px-2 py-0.5 rounded">
                          {t(`sites.${site.userRole.toLowerCase()}` as any)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* Create new site button */}
            <Button
              variant="outline"
              className="w-full justify-start gap-2 mt-2"
              onClick={() => {
                setDialogOpen(false)
                navigate('/sites/new')
              }}
            >
              <Plus className="h-4 w-4" />
              {t('sites.createSite')}
            </Button>
          </div>

          {sites.length === 1 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              {t('sites.onlyOneSite')}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}