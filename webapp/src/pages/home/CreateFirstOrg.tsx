import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Building2, Plus, Loader2 } from 'lucide-react'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'

// Function to get default currency based on timezone
function getDefaultCurrency(timezone: string): string {
  if (timezone.includes('Jerusalem') || timezone.includes('Tel_Aviv')) return 'ILS'
  if (timezone.includes('Dubai') || timezone.includes('Abu_Dhabi')) return 'AED'
  if (timezone.includes('Riyadh') || timezone.includes('Saudi')) return 'SAR'
  if (timezone.includes('London')) return 'GBP'
  if (timezone.includes('Paris') || timezone.includes('Berlin')) return 'EUR'
  if (timezone.includes('Toronto') || timezone.includes('Vancouver')) return 'CAD'
  if (timezone.includes('Sydney') || timezone.includes('Melbourne')) return 'AUD'
  if (timezone.includes('Tokyo')) return 'JPY'
  if (timezone.includes('Shanghai') || timezone.includes('Beijing')) return 'CNY'
  return 'USD'
}

// Function to infer language based on timezone
function getDefaultLanguage(timezone: string): 'en' | 'ar' | 'he' {
  // Hebrew for Israel
  if (timezone.includes('Jerusalem') || timezone.includes('Tel_Aviv')) return 'he'

  // Arabic for Middle East countries
  if (timezone.includes('Dubai') ||
      timezone.includes('Abu_Dhabi') ||
      timezone.includes('Riyadh') ||
      timezone.includes('Saudi') ||
      timezone.includes('Kuwait') ||
      timezone.includes('Bahrain') ||
      timezone.includes('Qatar') ||
      timezone.includes('Amman') ||
      timezone.includes('Beirut') ||
      timezone.includes('Damascus') ||
      timezone.includes('Baghdad') ||
      timezone.includes('Cairo') ||
      timezone.includes('Algeria') ||
      timezone.includes('Tunisia') ||
      timezone.includes('Casablanca')) {
    return 'ar'
  }

  // Default to English for all other regions
  return 'en'
}

export function CreateFirstOrg() {
  const { t } = useTranslation()
  const { setCurrentOrg } = useCurrentOrg()
  const utils = trpc.useUtils()

  // Get user's timezone and infer language and currency from it
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const defaultCurrency = getDefaultCurrency(userTimezone)
  const defaultLanguage = getDefaultLanguage(userTimezone)

  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState('')

  const createOrgMutation = trpc.organizations.create.useMutation({
    onSuccess: (org) => {
      setCurrentOrg(org)
      utils.organizations.list.invalidate()
    },
    onError: (error) => {
      setError(error.message)
    }
  })

  const handleCreate = async () => {
    setError('')

    if (!orgName.trim()) {
      setError(t('validation.required'))
      return
    }

    createOrgMutation.mutate({
      name: orgName.trim(),
      defaultCurrency: defaultCurrency,
      timezone: userTimezone,
      language: defaultLanguage,
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !createOrgMutation.isPending) {
      handleCreate()
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-lg w-full border-0 shadow-none">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('organizations.welcomeTitle')}</CardTitle>
          <CardDescription className="text-base mt-2">
            {t('organizations.welcomeDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder={t('organizations.namePlaceholder')}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={createOrgMutation.isPending}
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
              disabled={createOrgMutation.isPending}
            >
              {createOrgMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
              {createOrgMutation.isPending
                ? t('common.creating') + '...'
                : t('organizations.createButton')
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}