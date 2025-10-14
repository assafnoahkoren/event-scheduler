import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { WaitingListForm, type WaitingListFormData } from '@/components/WaitingListForm'
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

interface EventWaitingListTabProps {
  event: any
}

export function EventWaitingListTab({ event }: EventWaitingListTabProps) {
  const { t } = useTranslation()
  const [isWaitingListFormOpen, setIsWaitingListFormOpen] = useState(false)
  const [selectedWaitingListEntry, setSelectedWaitingListEntry] = useState<WaitingListEntry | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<WaitingListEntry | null>(null)

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

  return (
    <>
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
    </>
  )
}
