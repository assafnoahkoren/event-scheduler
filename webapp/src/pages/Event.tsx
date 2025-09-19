import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '@/utils/trpc'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
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

export function Event() {
  const { eventId } = useParams<{ eventId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: event, isLoading, error } = trpc.events.get.useQuery(
    { id: eventId || '' },
    { enabled: !!eventId }
  )

  const utils = trpc.useUtils()

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
    <div className="py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm">
          <h1 className="text-3xl font-bold mb-4">
            {event.title || t('events.untitledEvent')}
          </h1>

          <div className="text-lg text-muted-foreground mb-6">
            {format(new Date(event.startDate), 'PPPP')}
          </div>

          {event.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">{t('events.eventDescription')}</h2>
              <p className="text-muted-foreground">{event.description}</p>
            </div>
          )}

          {event.location && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">{t('events.eventLocation')}</h2>
              <p className="text-muted-foreground">{event.location}</p>
            </div>
          )}

          {/* Delete button at the bottom */}
          <div className="mt-8 pt-6 border-t">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteMutation.isPending}
              className="w-full sm:w-auto"
            >
              {deleteMutation.isPending ? (
                <>{t('events.deleting')}</>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('events.deleteEvent')}
                </>
              )}
            </Button>
          </div>
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