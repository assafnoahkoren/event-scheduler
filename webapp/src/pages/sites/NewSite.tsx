import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Sparkles, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function NewSite() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [siteName, setSiteName] = useState('')
  const [error, setError] = useState('')
  const { currentOrg } = useCurrentOrg()
  const utils = trpc.useUtils()
  const { setCurrentSite } = useCurrentSite()

  // Create site mutation
  const createMutation = trpc.sites.create.useMutation({
    onSuccess: (newSite) => {
      utils.sites.list.invalidate()
      // Set the newly created site as current
      setCurrentSite(newSite as any)
      // Navigate to home
      navigate('/')
    },
    onError: (error) => {
      setError(error.message)
    }
  })

  const handleCreate = () => {
    setError('')

    if (!siteName.trim()) {
      setError(t('validation.required'))
      return
    }

    if (!currentOrg) {
      setError('No organization selected')
      return
    }

    createMutation.mutate({
      name: siteName.trim(),
      organizationId: currentOrg.id
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !createMutation.isPending) {
      handleCreate()
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center">
        <div className="max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">{t('sites.createSite')}</h2>
            <p className="text-base mt-2 text-muted-foreground">
              {t('sites.welcomeDescription')}
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('sites.siteName')}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('sites.siteNamePlaceholder')}
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={createMutation.isPending}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={createMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="gap-2"
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
                {t('sites.createSite')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}