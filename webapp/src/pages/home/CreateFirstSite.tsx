import { trpc } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function CreateFirstSite() {
  const { t } = useTranslation()
  // Fetch user's sites
  const { data: sites, isLoading } = trpc.sites.list.useQuery()

  // If loading, show nothing (or you could show a skeleton)
  if (isLoading) {
    return null
  }

  // If user has sites, don't show the CTA
  if (sites && sites.length > 0) {
    return null
  }

  // Show call-to-action for creating first site
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('sites.welcomeTitle')}</CardTitle>
          <CardDescription className="text-base mt-2">
            {t('sites.welcomeDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            {t('sites.createFirstSite')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}