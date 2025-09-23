import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '@/utils/trpc'
import { useTranslation } from 'react-i18next'
import { useIsRtl } from '@/hooks/useIsRtl'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Clock } from 'lucide-react'
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
import { EventProductSection } from '@/components/events/EventProductSection'
import { EventServiceSection } from '@/components/events/EventServiceSection'
import { EventCostsSection } from '@/components/events/EventCostsSection'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { WaitingListForm, type WaitingListFormData } from '@/components/WaitingListForm'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface WaitingListEntry {
  id: string
  clientId: string
  ruleType: string
  specificDates?: any
  daysOfWeek?: any
  dateRange?: any
  expirationDate: string
  notes?: string | null
  status: string
  createdAt: string
  client: { name: string }
}

export function Event() {
  const { eventId } = useParams<{ eventId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isRtl = useIsRtl()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isWaitingListFormOpen, setIsWaitingListFormOpen] = useState(false)
  const [selectedWaitingListEntry, setSelectedWaitingListEntry] = useState<WaitingListEntry | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<WaitingListEntry | null>(null)

  const { data: event, isLoading, error } = trpc.events.get.useQuery(
    { id: eventId || '' },
    { enabled: !!eventId }
  )

  // Fetch waiting list entries for this event's client
  const { data: waitingListEntries }: { data?: any } = trpc.waitingList.list.useQuery(
    {
      siteId: event?.siteId || '',
      clientId: event?.clientId || undefined,
      includeExpired: false
    },
    { enabled: !!event?.siteId }
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

  const createWaitingListMutation = trpc.waitingList.create.useMutation({
    onSuccess: () => {
      utils.waitingList.list.invalidate()
      setIsWaitingListFormOpen(false)
      setSelectedWaitingListEntry(null)
    }
  })

  const updateWaitingListMutation = trpc.waitingList.update.useMutation({
    onSuccess: () => {
      utils.waitingList.list.invalidate()
      setIsWaitingListFormOpen(false)
      setSelectedWaitingListEntry(null)
    }
  })

  const deleteWaitingListMutation = trpc.waitingList.delete.useMutation({
    onSuccess: () => {
      utils.waitingList.list.invalidate()
      setEntryToDelete(null)
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

  const handleWaitingListSubmit = (data: WaitingListFormData) => {
    if (!event) return

    if (selectedWaitingListEntry) {
      updateWaitingListMutation.mutate({
        id: selectedWaitingListEntry.id,
        notes: data.notes,
        expirationDate: data.expirationDate
      })
    } else {
      createWaitingListMutation.mutate({
        siteId: event.siteId,
        ...data
      })
    }
  }

  const handleEditWaitingListEntry = (entry: WaitingListEntry) => {
    setSelectedWaitingListEntry(entry)
    setIsWaitingListFormOpen(true)
  }

  const handleDeleteWaitingListEntry = (entry: WaitingListEntry) => {
    setEntryToDelete(entry)
  }

  const confirmDeleteWaitingListEntry = () => {
    if (entryToDelete) {
      deleteWaitingListMutation.mutate({ id: entryToDelete.id })
    }
  }

  const handleNewWaitingListEntry = () => {
    setSelectedWaitingListEntry(null)
    setIsWaitingListFormOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: t('waitingList.status.pending'), className: 'bg-yellow-500' },
      FULFILLED: { label: t('waitingList.status.fulfilled'), className: 'bg-green-500' },
      EXPIRED: { label: t('waitingList.status.expired'), className: 'bg-gray-500' },
      CANCELLED: { label: t('waitingList.status.cancelled'), className: 'bg-red-500' }
    }
    const config = statusConfig[status as keyof typeof statusConfig]
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getRuleTypeLabel = (entry: WaitingListEntry) => {
    if (entry.ruleType === 'SPECIFIC_DATES' && entry.specificDates) {
      const dates = entry.specificDates as string[]
      return `${t('waitingList.specificDates')}: ${dates.length} dates`
    }
    if (entry.ruleType === 'DAY_OF_WEEK' && entry.daysOfWeek) {
      const days = entry.daysOfWeek as number[]
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayNames = days.map(d => weekdays[d])
      return `${t('waitingList.daysOfWeek')}: ${dayNames.join(', ')}`
    }
    if (entry.ruleType === 'DATE_RANGE' && entry.dateRange) {
      const range = entry.dateRange as { start: string; end: string }
      return `${t('waitingList.dateRange')}: ${range.start} - ${range.end}`
    }
    return entry.ruleType
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">{t('events.details')}</TabsTrigger>
              <TabsTrigger value="products">{t('events.products')}</TabsTrigger>
              <TabsTrigger value="services">{t('events.services')}</TabsTrigger>
              <TabsTrigger value="waiting">{t('waitingList.title')}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-6">
              <div className="space-y-4">
                {/* Event Costs Section */}
                {eventId && <EventCostsSection eventId={eventId} />}

                <EventForm
                  event={event}
                  onSubmit={handleUpdate}
                  isSubmitting={updateMutation.isPending}
                />

                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 me-2" />
                    {t('events.deleteEvent')}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="products" className="mt-6">
              <EventProductSection event={event} />
            </TabsContent>

            <TabsContent value="services" className="mt-6">
              <EventServiceSection event={event} />
            </TabsContent>

            <TabsContent value="waiting" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">{t('waitingList.clientWaitingList')}</h3>
                  <Button onClick={handleNewWaitingListEntry} size="sm">
                    <Plus className="h-4 w-4 me-2" />
                    {t('waitingList.newEntry')}
                  </Button>
                </div>

                {waitingListEntries && waitingListEntries.length > 0 ? (
                  <div className="grid gap-3">
                    {(waitingListEntries as WaitingListEntry[]).map((entry) => (
                      <Card key={entry.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{entry.client.name}</h4>
                                {getStatusBadge(entry.status)}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div>{getRuleTypeLabel(entry)}</div>
                                <div>{t('waitingList.expires')}: {format(new Date(entry.expirationDate), 'PPP')}</div>
                                {entry.notes && (
                                  <div className="mt-2 p-2 bg-muted rounded text-sm">{entry.notes}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditWaitingListEntry(entry)}
                                disabled={entry.status !== 'PENDING'}
                              >
                                {t('common.edit')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteWaitingListEntry(entry)}
                                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              >
                                {t('common.delete')}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-center">
                        {event?.clientId
                          ? t('waitingList.noEntriesForClient')
                          : t('waitingList.selectClientFirst')}
                      </p>
                      {event?.clientId && (
                        <Button onClick={handleNewWaitingListEntry} className="mt-4" size="sm">
                          <Plus className="h-4 w-4 me-2" />
                          {t('waitingList.createFirstEntry')}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Waiting List Form Drawer */}
      <Drawer open={isWaitingListFormOpen} onOpenChange={(open) => {
        setIsWaitingListFormOpen(open)
        if (!open) {
          setSelectedWaitingListEntry(null)
        }
      }}>
        <DrawerContent className="overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>
              {selectedWaitingListEntry ? t('waitingList.editEntry') : t('waitingList.newEntry')}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <WaitingListForm
              entry={selectedWaitingListEntry}
              initialClientId={event?.clientId || undefined}
              initialDate={event ? new Date(event.startDate) : undefined}
              onSubmit={handleWaitingListSubmit}
              onCancel={() => setIsWaitingListFormOpen(false)}
              isSubmitting={createWaitingListMutation.isPending || updateWaitingListMutation.isPending}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Waiting List Entry Dialog */}
      <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('waitingList.deleteEntry')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('waitingList.confirmDeleteDescription', { client: entryToDelete?.client.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteWaitingListEntry}
              disabled={deleteWaitingListMutation.isPending}
              className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            >
              {deleteWaitingListMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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