import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '@/utils/trpc'
import { useTranslation } from 'react-i18next'
import { useIsRtl } from '@/hooks/useIsRtl'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EventForm, type EventFormData } from '@/components/EventForm'

export function Event() {
  const { eventId } = useParams<{ eventId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isRtl = useIsRtl()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: event, isLoading, error } = trpc.events.get.useQuery(
    { id: eventId || '' },
    { enabled: !!eventId }
  )

  const utils = trpc.useUtils()

  const updateMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      utils.events.get.invalidate({ id: eventId })
      utils.events.list.invalidate()
    },
    onError: (error) => {
      console.error('Failed to update event:', error)
    }
  })

  const deleteMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      // Invalidate and refetch events
      utils.events.list.invalidate()
      // Navigate to home
      navigate('/')
    },
    onError: (error) => {
      console.error('Failed to delete event:', error)
    }
  })

  const handleUpdate = (formData: EventFormData) => {
    if (!eventId) return

    updateMutation.mutate({
      id: eventId,
      title: formData.title,
      description: formData.description || undefined,
      startDate: formData.startDate.toISOString(),
      endDate: formData.endDate?.toISOString() || undefined,
      isAllDay: formData.isAllDay,
      clientId: formData.clientId || undefined,
      status: formData.status,
    })
  }

  const handleDelete = () => {
    if (eventId) {
      deleteMutation.mutate({ id: eventId })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="py-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-red-600 mb-2">
            {error ? 'Error loading event' : 'Event not found'}
          </h1>
          {error && (
            <p className="text-muted-foreground">{error.message}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="max-w-2xl mx-auto">
        <div className="rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">
            {event.title || t('events.untitledEvent')}
          </h1>

          <Tabs defaultValue="details" className="w-full" dir={isRtl ? 'rtl' : 'ltr'}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">{t('events.details')}</TabsTrigger>
              <TabsTrigger value="danger">{t('events.dangerZone')}</TabsTrigger>

            </TabsList>

            <TabsContent value="details" className="mt-6">
              <EventForm
                event={event}
                onSubmit={handleUpdate}
                isSubmitting={updateMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="danger" className="mt-6">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  {t('events.dangerZone')}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {t('events.dangerZoneDescription')}
                </p>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t('events.deleteEvent')}</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {t('events.confirmDeleteDescription')}
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                          {t('events.deleting')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Trash2 className="h-4 w-4" />
                          {t('events.deleteEvent')}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('events.confirmDeleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}