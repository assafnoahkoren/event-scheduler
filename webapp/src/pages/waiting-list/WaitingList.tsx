import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Clock, CheckCircle, XCircle, AlertCircle, CalendarSearch } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { WaitingListForm, type WaitingListFormData } from '@/components/WaitingListForm'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { format } from 'date-fns'

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

export function WaitingList() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<WaitingListEntry | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<WaitingListEntry | null>(null)
  const [showMatches, setShowMatches] = useState(false)

  const utils = trpc.useUtils()

  // Fetch waiting list entries
  const { data: entries, isLoading }: { data?: any, isLoading: boolean } = trpc.waitingList.list.useQuery(
    {
      siteId: currentSite?.id || '',
      status: statusFilter === 'ALL' ? undefined : statusFilter as any,
      includeExpired: statusFilter === 'EXPIRED'
    },
    { enabled: !!currentSite }
  )

  // Check all matches query
  const { data: matchesData, refetch: refetchMatches }: { data?: any, refetch: any } = trpc.waitingList.checkAllMatches.useQuery(
    {
      siteId: currentSite?.id || ''
    },
    {
      enabled: !!currentSite && showMatches,
      refetchOnWindowFocus: false
    }
  )

  // Mutations
  const createMutation = trpc.waitingList.create.useMutation({
    onSuccess: () => {
      utils.waitingList.list.invalidate()
      setIsFormOpen(false)
      setSelectedEntry(null)
    }
  })

  const updateMutation = trpc.waitingList.update.useMutation({
    onSuccess: () => {
      utils.waitingList.list.invalidate()
      setIsFormOpen(false)
      setSelectedEntry(null)
    }
  })

  const deleteMutation = trpc.waitingList.delete.useMutation({
    onSuccess: () => {
      utils.waitingList.list.invalidate()
      setEntryToDelete(null)
    }
  })

  const handleSubmit = (data: WaitingListFormData) => {
    if (!currentSite) return

    if (selectedEntry) {
      updateMutation.mutate({
        id: selectedEntry.id,
        clientId: data.clientId,
        ruleType: data.ruleType,
        specificDates: data.specificDates,
        daysOfWeek: data.daysOfWeek,
        dateRange: data.dateRange,
        notes: data.notes,
        expirationDate: data.expirationDate
      })
    } else {
      createMutation.mutate({
        siteId: currentSite.id,
        ...data
      })
    }
  }

  const handleEdit = (entry: WaitingListEntry) => {
    setSelectedEntry(entry)
    setIsFormOpen(true)
  }

  const handleDelete = (entry: WaitingListEntry) => {
    setEntryToDelete(entry)
  }

  const confirmDelete = () => {
    if (entryToDelete) {
      deleteMutation.mutate({ id: entryToDelete.id })
    }
  }

  const handleNewEntry = () => {
    setSelectedEntry(null)
    setIsFormOpen(true)
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

  if (!currentSite) {
    return (
      <div className="container py-8 flex items-center justify-center">
        <div>{t('sites.noSiteSelected')}</div>
      </div>
    )
  }

  const filteredEntries = (entries as WaitingListEntry[])?.filter(entry => {
    if (searchQuery) {
      return entry.client.name.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  }) || []

  return (
    <div className="container py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('waitingList.title')}</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowMatches(!showMatches)
                if (!showMatches) refetchMatches()
              }}
            >
              <CalendarSearch className="h-4 w-4 me-2" />
              {t('waitingList.checkMatches')}
            </Button>
            <Button onClick={handleNewEntry}>
              <Plus className="h-4 w-4 me-2" />
              {t('waitingList.newEntry')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('waitingList.searchByClient')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('waitingList.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('waitingList.allStatuses')}</SelectItem>
              <SelectItem value="PENDING">{t('waitingList.status.pending')}</SelectItem>
              <SelectItem value="FULFILLED">{t('waitingList.status.fulfilled')}</SelectItem>
              <SelectItem value="EXPIRED">{t('waitingList.status.expired')}</SelectItem>
              <SelectItem value="CANCELLED">{t('waitingList.status.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Matches Summary */}
      {showMatches && matchesData && (
        <Card className="mb-6 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">{t('waitingList.matchesTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-2xl font-bold">{matchesData.summary.totalPendingEntries}</div>
                <div className="text-sm text-muted-foreground">{t('waitingList.totalPending')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{matchesData.summary.entriesWithMatches}</div>
                <div className="text-sm text-muted-foreground">{t('waitingList.withMatches')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{matchesData.summary.totalAvailableDates}</div>
                <div className="text-sm text-muted-foreground">{t('waitingList.availableDates')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{matchesData.summary.datesWithConflicts}</div>
                <div className="text-sm text-muted-foreground">{t('waitingList.conflictingDates')}</div>
              </div>
            </div>

            {matchesData.conflictingDates.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">{t('waitingList.conflicts')}</h3>
                <div className="space-y-2">
                  {matchesData.conflictingDates.map(conflict => (
                    <div key={conflict.date} className="bg-orange-50 p-2 rounded">
                      <div className="font-medium">{format(new Date(conflict.date), 'PPP')}</div>
                      <div className="text-sm text-muted-foreground">
                        {conflict.entries.map(e => (
                          <div key={e.entry.id}>
                            {t('waitingList.priority')} {e.priority}: {e.entry.client.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Entries List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div>{t('common.loading')}</div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {searchQuery ? t('waitingList.noEntriesFound') : t('waitingList.noEntries')}
            </p>
            {!searchQuery && (
              <Button onClick={handleNewEntry} className="mt-4">
                <Plus className="h-4 w-4 me-2" />
                {t('waitingList.createFirstEntry')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{entry.client.name}</h3>
                      {getStatusBadge(entry.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>{getRuleTypeLabel(entry)}</div>
                      <div>{t('waitingList.expires')}: {format(new Date(entry.expirationDate), 'PPP')}</div>
                      <div>{t('waitingList.createdAt')}: {format(new Date(entry.createdAt), 'PPP')}</div>
                      {entry.notes && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">{entry.notes}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(entry)}
                      disabled={entry.status !== 'PENDING'}
                    >
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(entry)}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form Drawer */}
      <Drawer open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open)
        if (!open) {
          setSelectedEntry(null)
        }
      }}>
        <DrawerContent className="overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>
              {selectedEntry ? t('waitingList.editEntry') : t('waitingList.newEntry')}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <WaitingListForm
              entry={selectedEntry}
              onSubmit={handleSubmit}
              onCancel={() => setIsFormOpen(false)}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation */}
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
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}