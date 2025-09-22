import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { ClientForm, type ClientFormData } from '@/components/ClientForm'
import { ClientList } from '@/components/ClientList'
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
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ClientSearchResult = RouterOutput['clients']['search'][0]
type ClientFull = RouterOutput['clients']['get']

export function Clients() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState<ClientFull | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<ClientSearchResult | null>(null)

  const utils = trpc.useUtils()

  // Fetch full client data when editing
  const { data: fullClientData } = trpc.clients.get.useQuery(
    { id: selectedClientId! },
    {
      enabled: !!selectedClientId
    }
  )

  // When full client data is loaded, open the form
  useEffect(() => {
    if (fullClientData && selectedClientId) {
      setSelectedClient(fullClientData)
      setIsFormOpen(true)
    }
  }, [fullClientData, selectedClientId])

  // Mutations
  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.search.invalidate()
      setIsFormOpen(false)
      setSelectedClient(null)
      setSelectedClientId(null)
    },
  })

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.search.invalidate()
      setIsFormOpen(false)
      setSelectedClient(null)
      setSelectedClientId(null)
    },
  })

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      utils.clients.search.invalidate()
      setIsDeleteOpen(false)
      setClientToDelete(null)
    },
  })

  const handleSubmit = (data: ClientFormData) => {
    if (!currentSite) return

    if (selectedClient) {
      updateMutation.mutate({
        id: selectedClient.id,
        ...data
      })
    } else {
      createMutation.mutate({
        siteId: currentSite.id,
        ...data
      })
    }
  }

  const handleEdit = (client: ClientSearchResult) => {
    setSelectedClientId(client.id)
  }

  const handleDelete = (client: ClientSearchResult) => {
    setClientToDelete(client)
    setIsDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (clientToDelete) {
      deleteMutation.mutate({ id: clientToDelete.id })
    }
  }

  const handleNewClient = () => {
    setSelectedClient(null)
    setSelectedClientId(null)
    setIsFormOpen(true)
  }

  if (!currentSite) {
    return (
      <div className="container py-8 flex items-center justify-center">
        <div>{t('sites.noSiteSelected')}</div>
      </div>
    )
  }

  return (
    <div className="container py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('clients.clients')}</h1>
          <Button onClick={handleNewClient}>
            <Plus className="h-4 w-4 me-2" />
            {t('clients.newClient')}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('clients.searchClients')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>
      </div>

      {/* Clients List */}
      <ClientList
        siteId={currentSite.id}
        searchQuery={searchQuery}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onNewClient={handleNewClient}
      />

      {/* Edit/Create Drawer */}
      <Drawer open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open)
        if (!open) {
          setSelectedClient(null)
          setSelectedClientId(null)
        }
      }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {selectedClient ? t('clients.editClient') : t('clients.newClient')}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <ClientForm
              client={selectedClient}
              onSubmit={handleSubmit}
              onCancel={() => setIsFormOpen(false)}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.deleteClient')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.confirmDeleteDescription', { name: clientToDelete?.name })}
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