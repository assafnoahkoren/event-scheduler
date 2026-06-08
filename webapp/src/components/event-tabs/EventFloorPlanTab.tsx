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
import { Download, Loader2, Map, Plus, Share2, Trash2 } from 'lucide-react'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import { renderEventLayoutToBlob } from '@/utils/renderLayoutImage'
import { EventFloorPlanPicker } from './EventFloorPlanPicker'
import { LayoutPreview } from './LayoutPreview'

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
  const [exporting, setExporting] = useState(false)

  const { data: layouts, isLoading } = trpc.floorPlans.eventLayouts.list.useQuery(
    { eventId },
    { enabled: !!eventId }
  )

  // One layout per event (YAGNI): we only ever read/operate on the first.
  const layout = layouts?.[0] ?? null

  const { signedUrl } = useSignedUrl({ fileId: layout?.floorPlan?.imageFile?.id })

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
  const totalSeats = layout.components?.reduce((sum, c) => sum + (c.componentType?.occupancy ?? 0), 0) ?? 0
  const filename = `${layout.name || 'floor-plan'}.png`

  const exportBlob = async () => {
    if (!signedUrl) throw new Error('Image not ready')
    return renderEventLayoutToBlob(layout, signedUrl)
  }

  const handleDownload = async () => {
    try {
      setExporting(true)
      const blob = await exportBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(t('eventFloorPlan.exportError'), { description: (err as Error).message })
    } finally {
      setExporting(false)
    }
  }

  const handleShare = async () => {
    try {
      setExporting(true)
      const blob = await exportBlob()
      const file = new File([blob], filename, { type: 'image/png' })
      await navigator.share({ files: [file], title: layout.name ?? '' })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error(t('eventFloorPlan.exportError'), { description: (err as Error).message })
      }
    } finally {
      setExporting(false)
    }
  }

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [new File([new Blob()], 'x.png', { type: 'image/png' })] })

  return (
    <div className="px-4 space-y-4">
      <div className="flex items-center justify-between border rounded-lg p-4">
        <button
          className="flex items-center gap-3 text-start flex-1"
          onClick={() => navigate(`/event/${eventId}/floor-plan/${layout.id}`)}
        >
          <Map className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">{layout.name}</p>
            <p className="text-sm text-muted-foreground">
              {t('eventFloorPlan.items', { count: itemCount })} · {t('eventFloorPlan.seats', { count: totalSeats })}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate(`/event/${eventId}/floor-plan/${layout.id}`)}>
            {t('eventFloorPlan.open')}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setRemoveOpen(true)} disabled={removeMutation.isPending}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <LayoutPreview
        layout={layout}
        onClick={() => navigate(`/event/${eventId}/floor-plan/${layout.id}`)}
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleDownload}
          disabled={exporting || !signedUrl}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 me-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 me-2" />
          )}
          {t('eventFloorPlan.download')}
        </Button>
        {canShareFiles && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleShare}
            disabled={exporting || !signedUrl}
          >
            <Share2 className="h-4 w-4 me-2" />
            {t('eventFloorPlan.share')}
          </Button>
        )}
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
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('eventFloorPlan.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
