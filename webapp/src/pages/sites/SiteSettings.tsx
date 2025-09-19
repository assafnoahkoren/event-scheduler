import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { trpc } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Users, Trash2, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function SiteSettings() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentSite, setCurrentSite } = useCurrentSite()
  const utils = trpc.useUtils()

  const [siteName, setSiteName] = useState(currentSite?.name || '')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Update site mutation
  const updateSiteMutation = trpc.sites.update.useMutation({
    onSuccess: (updatedSite) => {
      utils.sites.list.invalidate()
      setCurrentSite(updatedSite as any)
    }
  })

  // Delete site mutation
  const deleteSiteMutation = trpc.sites.delete.useMutation({
    onSuccess: () => {
      utils.sites.list.invalidate()
      navigate('/')
    }
  })

  const handleUpdateSite = () => {
    if (!currentSite || !siteName.trim()) return

    updateSiteMutation.mutate({
      siteId: currentSite.id,
      name: siteName.trim()
    })
  }

  const handleDeleteSite = () => {
    if (!currentSite) return

    deleteSiteMutation.mutate({
      siteId: currentSite.id
    })
  }

  if (!currentSite) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>{t('sites.noSiteSelected')}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            {t('sites.siteSettings')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('sites.siteSettingsDescription')}
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="w-full flex justify-center">
            <TabsTrigger className="flex-1" value="general">{t('sites.general')}</TabsTrigger>
            <TabsTrigger className="flex-1" value="members">{t('sites.members')}</TabsTrigger>
            <TabsTrigger className="flex-1" value="danger">{t('sites.dangerZone')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('sites.siteInformation')}</CardTitle>
                <CardDescription>
                  {t('sites.siteInformationDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">{t('sites.siteName')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="siteName"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      placeholder={t('sites.siteNamePlaceholder')}
                    />
                    <Button
                      onClick={handleUpdateSite}
                      disabled={!siteName.trim() || siteName === currentSite.name || updateSiteMutation.isPending}
                    >
                      {updateSiteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t('common.save')
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('sites.siteId')}</Label>
                  <div className="font-mono text-sm text-muted-foreground">
                    {currentSite.id}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('sites.createdAt')}</Label>
                  <div className="text-sm text-muted-foreground">
                    {new Date(currentSite.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('sites.teamMembers')}</CardTitle>
                <CardDescription>
                  {t('sites.teamMembersDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{t('common.you')}</p>
                        <p className="text-sm text-muted-foreground">{t('sites.owner')}</p>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    {t('sites.inviteMembers')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="danger" className="space-y-4">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">{t('sites.dangerZone')}</CardTitle>
                <CardDescription>
                  {t('sites.dangerZoneDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('sites.deleteSite')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sites.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sites.confirmDeleteDescription', { siteName: currentSite.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSite}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteSiteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}