import { useState, useCallback } from 'react'
import { Check, ChevronsUpDown, UserPlus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { trpc } from '@/utils/trpc'
import { useTranslation } from 'react-i18next'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { useDebounce } from '@/hooks/useDebounce'
import { ClientForm, type ClientFormData } from '@/components/ClientForm'

interface ClientComboboxProps {
  value?: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
}

export function ClientCombobox({
  value,
  onValueChange,
  placeholder,
  disabled = false
}: ClientComboboxProps) {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showClientDialog, setShowClientDialog] = useState(false)
  const [prefilledName, setPrefilledName] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const utils = trpc.useUtils()

  // Search clients
  const { data: clients = [], isLoading } = trpc.clients.search.useQuery(
    {
      siteId: currentSite?.id || '',
      query: debouncedSearchQuery,
      limit: 20
    },
    {
      enabled: !!currentSite?.id
    }
  )

  // Get selected client details
  const { data: selectedClient } = trpc.clients.get.useQuery(
    { id: value! },
    {
      enabled: !!value
    }
  )

  // Create client mutation
  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: (newClient) => {
      onValueChange(newClient.id)
      setOpen(false)
      setShowClientDialog(false)
      setSearchQuery('')
      setPrefilledName('')
      // Invalidate search query to refresh the list
      utils.clients.search.invalidate()
    }
  })

  const handleOpenClientDialog = useCallback((name: string = '') => {
    setPrefilledName(name)
    setShowClientDialog(true)
    setOpen(false) // Close the popover
  }, [])

  const handleCreateClient = useCallback((formData: ClientFormData) => {
    if (!currentSite?.id) return

    createClientMutation.mutate({
      siteId: currentSite.id,
      ...formData
    })
  }, [currentSite?.id, createClientMutation])

  const handleSelect = useCallback((clientId: string) => {
    onValueChange(clientId === value ? null : clientId)
    setOpen(false)
    setSearchQuery('')
  }, [value, onValueChange])

  const displayValue = selectedClient?.name || ''

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {displayValue || placeholder || t('clients.selectClient')}
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-2" align="start">
          <div className="flex items-center border-b px-3 pb-2 mb-2">
            <Search className="me-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder={t('clients.searchClients')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('common.loading')}
              </div>
            ) : clients.length === 0 ? (
              <div className="py-2 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {t('clients.noClientsFound')}
                </p>
                <div
                  onClick={() => handleOpenClientDialog(searchQuery.trim())}
                  className="mx-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center justify-center"
                >
                  <UserPlus className="me-2 h-4 w-4" />
                  {searchQuery.trim()
                    ? t('clients.createClient', { name: searchQuery.trim() })
                    : t('clients.newClient')}
                </div>
              </div>
            ) : (
              <>
                <div className="mb-1">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => handleSelect(client.id)}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    >
                      <Check
                        className={cn(
                          'me-2 h-4 w-4',
                          value === client.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{client.name}</div>
                        {(client.email || client.phone) && (
                          <div className="text-xs text-muted-foreground">
                            {client.email && <span>{client.email}</span>}
                            {client.email && client.phone && <span> • </span>}
                            {client.phone && <span>{client.phone}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-1">
                  <div
                    onClick={() => handleOpenClientDialog(searchQuery.trim())}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  >
                    <UserPlus className="me-2 h-4 w-4" />
                    {searchQuery.trim() && !clients.find(c => c.name.toLowerCase() === searchQuery.trim().toLowerCase())
                      ? t('clients.createClient', { name: searchQuery.trim() })
                      : t('clients.newClient')}
                  </div>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Client Creation Dialog */}
      <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{t('clients.newClient')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ClientForm
              initialName={prefilledName}
              onSubmit={handleCreateClient}
              onCancel={() => {
                setShowClientDialog(false)
                setPrefilledName('')
              }}
              isSubmitting={createClientMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}