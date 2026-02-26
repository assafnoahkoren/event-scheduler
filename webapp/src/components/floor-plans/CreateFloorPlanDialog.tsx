import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CreateFloorPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateFloorPlanDialog({ open, onOpenChange }: CreateFloorPlanDialogProps) {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const [name, setName] = useState('')

  const utils = trpc.useUtils()

  const createMutation = trpc.floorPlans.siteFloorPlans.create.useMutation({
    onSuccess: () => {
      toast.success(t('floorPlans.createSuccess'))
      utils.floorPlans.siteFloorPlans.list.invalidate()
      onOpenChange(false)
      setName('')
    },
    onError: (error) => {
      toast.error(t('floorPlans.createError'), {
        description: error.message,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentSite || !name.trim()) return

    createMutation.mutate({
      siteId: currentSite.id,
      name: name.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('floorPlans.createFloorPlan')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('floorPlans.name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('floorPlans.namePlaceholder')}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? t('common.creating') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
