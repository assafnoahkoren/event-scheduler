import { useState } from 'react'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Sparkles, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function CreateFirstSite() {
  const { t } = useTranslation()
  const [siteName, setSiteName] = useState('')
  const [error, setError] = useState('')
  const utils = trpc.useUtils()
  const { setCurrentSite } = useCurrentSite()
  const { currentOrg } = useCurrentOrg()

  // Fetch user's sites
  const { data: sites, isLoading } = trpc.sites.list.useQuery()

  // Create site mutation
  const createMutation = trpc.sites.create.useMutation({
    onSuccess: (newSite) => {
      utils.sites.list.invalidate()
      setSiteName('')
      setError('')
      // Set the newly created site as current
      setCurrentSite(newSite as any)
    },
    onError: (error) => {
      setError(error.message)
    }
  })

  // If loading, show nothing (or you could show a skeleton)
  if (isLoading) {
    return null
  }

  // If user has sites, don't show the CTA
  if (sites && sites.length > 0) {
    return null
  }

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

  // Show call-to-action for creating first site
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-lg w-full border-0 shadow-none">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('sites.welcomeTitle')}</CardTitle>
          <CardDescription className="text-base mt-2">
            {t('sites.welcomeDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder={t('sites.siteNamePlaceholder')}
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={createMutation.isPending}
              className="text-center"
            />
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
          <div className="flex justify-center">
            <Button
              size="lg"
              className="gap-2"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
              {t('sites.createFirstSite')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}