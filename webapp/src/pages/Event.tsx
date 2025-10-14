import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '@/utils/trpc'
import { useTranslation } from 'react-i18next'
import { useIsRtl } from '@/hooks/useIsRtl'
import { Button } from '@/components/ui/button'
import { Clock, FileText, Package, Briefcase, CheckSquare, DollarSign, FolderOpen } from 'lucide-react'
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
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { type EventFormData } from '@/components/EventForm'
import { EventDetailsTab } from '@/components/event-tabs/EventDetailsTab'
import { EventProductsTab } from '@/components/event-tabs/EventProductsTab'
import { EventServicesTab } from '@/components/event-tabs/EventServicesTab'
import { EventTasksTab } from '@/components/event-tabs/EventTasksTab'
import { EventFinancesTab } from '@/components/event-tabs/EventFinancesTab'
import { EventFilesTab } from '@/components/event-tabs/EventFilesTab'
import { EventWaitingListTab } from '@/components/event-tabs/EventWaitingListTab'

export function Event() {
  const { eventId } = useParams<{ eventId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isRtl = useIsRtl()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

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
    <div className="pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-lg p-6">
          <h1 className="text-md font-bold mb-6">
            {event.title || t('events.untitledEvent')}
          </h1>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={isRtl ? 'rtl' : 'ltr'}>
            <TabsContent value="details" className="mt-6">
              {eventId && (
                <EventDetailsTab
                  eventId={eventId}
                  event={event}
                  onUpdate={handleUpdate}
                  onDeleteClick={() => setShowDeleteDialog(true)}
                  isUpdating={updateMutation.isPending}
                  isDeleting={deleteMutation.isPending}
                />
              )}
            </TabsContent>

            <TabsContent value="products" className="mt-6">
              <EventProductsTab event={event} />
            </TabsContent>

            <TabsContent value="services" className="mt-6">
              <EventServicesTab event={event} />
            </TabsContent>

            <TabsContent value="waiting" className="mt-6">
              <EventWaitingListTab event={event} />
            </TabsContent>

            <TabsContent value="tasks" className="mt-6">
              <EventTasksTab />
            </TabsContent>

            <TabsContent value="finances" className="mt-6">
              <EventFinancesTab />
            </TabsContent>

            <TabsContent value="files" className="mt-6">
              {eventId && <EventFilesTab eventId={eventId} />}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer Tab Navigation */}
      <div className="fixed bottom-0 start-0 end-0 bg-background border-t z-40">
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-7 gap-1">
            <Button
              variant={activeTab === 'details' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('details')}
            >
              <FileText className="h-5 w-5" />
              {activeTab === 'details' && <span className="text-xs">{t('events.details')}</span>}
            </Button>
            <Button
              variant={activeTab === 'products' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('products')}
            >
              <Package className="h-5 w-5" />
              {activeTab === 'products' && <span className="text-xs">{t('events.products')}</span>}
            </Button>
            <Button
              variant={activeTab === 'services' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('services')}
            >
              <Briefcase className="h-5 w-5" />
              {activeTab === 'services' && <span className="text-xs">{t('events.services')}</span>}
            </Button>
            <Button
              variant={activeTab === 'tasks' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('tasks')}
            >
              <CheckSquare className="h-5 w-5" />
              {activeTab === 'tasks' && <span className="text-xs">{t('tasks.title')}</span>}
            </Button>
            <Button
              variant={activeTab === 'finances' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('finances')}
            >
              <DollarSign className="h-5 w-5" />
              {activeTab === 'finances' && <span className="text-xs">{t('finances.title')}</span>}
            </Button>
            <Button
              variant={activeTab === 'files' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('files')}
            >
              <FolderOpen className="h-5 w-5" />
              {activeTab === 'files' && <span className="text-xs">{t('files.title')}</span>}
            </Button>
            <Button
              variant={activeTab === 'waiting' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('waiting')}
            >
              <Clock className="h-5 w-5" />
              {activeTab === 'waiting' && <span className="text-xs">{t('waitingList.title')}</span>}
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