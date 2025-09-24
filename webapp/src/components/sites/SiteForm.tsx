import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface SiteFormProps {
  siteId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function SiteForm({ siteId, onSuccess, onCancel }: SiteFormProps) {
  const { t } = useTranslation()
  const { currentOrg } = useCurrentOrg()
  const utils = trpc.useUtils()

  const [formData, setFormData] = useState({
    name: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch site data if in edit mode
  const { data: site } = trpc.sites.get.useQuery(
    { siteId: siteId! },
    { enabled: !!siteId }
  )

  // Create mutation
  const createMutation = trpc.sites.create.useMutation({
    onSuccess: () => {
      utils.sites.list.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      setErrors({ form: error.message })
    }
  })

  // Update mutation
  const updateMutation = trpc.sites.update.useMutation({
    onSuccess: () => {
      utils.sites.get.invalidate({ siteId: siteId! })
      utils.sites.list.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      setErrors({ form: error.message })
    }
  })

  // Populate form when site data is loaded
  useEffect(() => {
    if (site) {
      setFormData({
        name: site.name
      })
    }
  }, [site])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Basic validation
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = t('validation.required')
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    if (siteId) {
      updateMutation.mutate({
        siteId,
        ...formData
      })
    } else {
      if (!currentOrg) return
      createMutation.mutate({
        organizationId: currentOrg.id,
        ...formData
      })
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('sites.siteName')}</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t('sites.siteNamePlaceholder')}
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      {errors.form && (
        <div className="rounded-md bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{errors.form}</p>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {siteId ? t('common.save') : t('common.create')}
        </Button>
      </div>
    </form>
  )
}