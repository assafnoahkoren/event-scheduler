import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { Loader2, Map, Plus, Trash2 } from 'lucide-react'
import { EventFloorPlanPicker } from './EventFloorPlanPicker'

interface EventFloorPlanTabProps {
  eventId: string
  siteId: string
}

export function EventFloorPlanTab({ eventId, siteId }: EventFloorPlanTabProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)

  const { data: layouts, isLoading } = trpc.floorPlans.eventLayouts.list.useQuery(
    { eventId },
    { enabled: !!eventId }
  )

  // One layout per event (YAGNI): we only ever read/operate on the first.
  const layout = layouts?.[0] ?? null

  const removeMutation = trpc.floorPlans.eventLayouts.delete.useMutation({
    onSuccess: () => {
      utils.floorPlans.eventLayouts.list.invalidate({ eventId })
      toast.success(t('eventFloorPlan.removed'))
      setRemoveOpen(false)
    },
    onError: (error) => {
      toast.error(t('eventFloorPlan.removeError'), { description: error.message })
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!layout) {
    return (
      <div className="px-4">
        <div className="flex flex-col items-center justify-center text-center border border-dashed rounded-lg py-12 gap-3">
          <Map className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">{t('eventFloorPlan.empty')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('eventFloorPlan.emptyDescription')}</p>
          </div>
          <Button onClick={() => setPickerOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t('eventFloorPlan.add')}
          </Button>
        </div>
        <EventFloorPlanPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          eventId={eventId}
          siteId={siteId}
        />
      </div>
    )
  }

  const itemCount = layout.components?.length ?? 0

  return (
    <div className="px-4">
      <div className="flex items-center justify-between border rounded-lg p-4">
        <button
          className="flex items-center gap-3 text-start flex-1"
          onClick={() => navigate(`/event/${eventId}/floor-plan/${layout.id}`)}
        >
          <Map className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">{layout.name}</p>
            <p className="text-sm text-muted-foreground">{t('eventFloorPlan.items', { count: itemCount })}</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate(`/event/${eventId}/floor-plan/${layout.id}`)}>
            {t('eventFloorPlan.open')}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setRemoveOpen(true)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('eventFloorPlan.removeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('eventFloorPlan.removeDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMutation.mutate({ id: layout.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('eventFloorPlan.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
