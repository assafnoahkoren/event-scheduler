import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { toast } from 'sonner'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronRight } from 'lucide-react'

interface EventFloorPlanPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  siteId: string
}

export function EventFloorPlanPicker({ open, onOpenChange, eventId, siteId }: EventFloorPlanPickerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const { data: templates, isLoading } = trpc.floorPlans.templates.listBySite.useQuery(
    { siteId },
    { enabled: open && !!siteId }
  )

  const createMutation = trpc.floorPlans.eventLayouts.createFromTemplate.useMutation({
    onSuccess: (layout) => {
      // createFromTemplate re-reads via findFirst, so the type is nullable. A null
      // here means the layout couldn't be loaded back — treat it as a failure
      // rather than silently closing on a "success" the user can't see.
      if (!layout) {
        toast.error(t('eventFloorPlan.createError'))
        return
      }
      utils.floorPlans.eventLayouts.list.invalidate({ eventId })
      toast.success(t('eventFloorPlan.created'))
      onOpenChange(false)
      navigate(`/event/${eventId}/floor-plan/${layout.id}`)
    },
    onError: (error) => {
      // A CONFLICT means this floor plan already has a layout for the event
      // (the one-layout-per-floor-plan constraint) — give a clear message.
      if (error.data?.code === 'CONFLICT') {
        toast.error(t('eventFloorPlan.alreadyExists'))
        return
      }
      toast.error(t('eventFloorPlan.createError'), { description: error.message })
    },
  })

  // Group templates by floor plan for a labelled-but-flat list.
  const groups = useMemo(() => {
    const byPlan = new Map<string, { id: string; name: string; rows: NonNullable<typeof templates> }>()
    for (const tpl of templates ?? []) {
      const key = tpl.floorPlan.id
      if (!byPlan.has(key)) byPlan.set(key, { id: key, name: tpl.floorPlan.name, rows: [] })
      byPlan.get(key)!.rows.push(tpl)
    }
    return Array.from(byPlan.values())
  }, [templates])

  const isEmpty = !isLoading && (templates?.length ?? 0) === 0

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader>
          <DrawerTitle>{t('eventFloorPlan.pickerTitle')}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {isEmpty && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('eventFloorPlan.noTemplates')}
            </p>
          )}
          {groups.map((group) => (
            <div key={group.id} className="mb-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-1 px-1">{group.name}</h4>
              <div className="flex flex-col gap-1">
                {group.rows.map((tpl) => (
                  <Button
                    key={tpl.id}
                    variant="outline"
                    className="justify-between h-auto py-3"
                    disabled={createMutation.isPending}
                    onClick={() => createMutation.mutate({ eventId, templateId: tpl.id, name: tpl.name })}
                  >
                    <span>{tpl.name}</span>
                    <ChevronRight className="h-4 w-4 rtl:rotate-180 opacity-50" />
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
