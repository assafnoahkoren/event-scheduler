import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ClientCombobox } from '@/components/ClientCombobox'
import { ClientForm, type ClientFormData } from '@/components/ClientForm'
import { trpc } from '@/utils/trpc'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'
import { TimeInput } from '@/components/ui/TimeInput'
import { CateringInput } from '@/components/CateringInput'

type RouterOutput = inferRouterOutputs<AppRouter>
type Event = RouterOutput['events']['get']

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface EventFormProps {
  siteId?: string
  event?: Event | null
  initialDate?: Date
  initialClientId?: string | null
  onSubmit: (data: EventFormData) => void
  onCancel?: () => void
  isSubmitting?: boolean
  saveError?: boolean
}

export interface EventFormData {
  type: 'EVENT' | 'PRE_EVENT_MEETING'
  title: string
  nickname?: string
  depositAmount?: number | null
  acumPaid?: boolean
  description?: string
  startDate: Date
  endDate?: Date
  isAllDay: boolean
  clientId?: string | null
  status?: 'DRAFT' | 'SCHEDULED' | 'CANCELLED'
  catering?: string
  startTime?: string
  endTime?: string
  guestCountAdults?: number | null
  guestCountChildren?: number | null
}

export function EventForm({
  siteId,
  event,
  initialDate,
  initialClientId,
  onSubmit,
  onCancel,
  isSubmitting = false,
  saveError = false
}: EventFormProps) {
  const { t } = useTranslation()
  const utils = trpc.useUtils()
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  // Form state
  const [type, setType] = useState<'EVENT' | 'PRE_EVENT_MEETING'>(event?.type || 'EVENT')
  const [title, setTitle] = useState(event?.title || '')
  const [nickname, setNickname] = useState(event?.nickname || '')
  const [depositAmount, setDepositAmount] = useState<number | ''>(event?.depositAmount ?? '')
  const [acumPaid, setAcumPaid] = useState(event?.acumPaid ?? false)
  const [description, setDescription] = useState(event?.description || '')
  const [startDate, setStartDate] = useState(
    event?.startDate ? new Date(event.startDate) : (initialDate || new Date())
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    event?.endDate ? new Date(event.endDate) : undefined
  )
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay || false)
  const [clientId, setClientId] = useState<string | null>(event?.clientId || initialClientId || null)
  const [status, setStatus] = useState<'DRAFT' | 'SCHEDULED' | 'CANCELLED'>(
    event?.status || 'DRAFT'
  )
  const [catering, setCatering] = useState<string | undefined>(event?.catering ?? undefined)
  const [startTime, setStartTime] = useState<string | undefined>(event?.startTime ?? undefined)
  const [endTime, setEndTime] = useState<string | undefined>(event?.endTime ?? undefined)
  const [guestCountAdults, setGuestCountAdults] = useState<number | ''>(event?.guestCountAdults ?? '')
  const [guestCountChildren, setGuestCountChildren] = useState<number | ''>(event?.guestCountChildren ?? '')
  const [showClientForm, setShowClientForm] = useState(false)

  // Drives the auto-save status indicator rendered in the actions row
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle')
  const wasSubmitting = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)
  const onSubmitRef = useRef(onSubmit)
  useEffect(() => { onSubmitRef.current = onSubmit }, [onSubmit])
  // Reset isFirstRender on unmount so StrictMode double-invocation and re-mounts start clean
  useEffect(() => () => { isFirstRender.current = true }, [])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = descriptionRef.current
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto'
      // Set the height to scrollHeight, but cap at max height (200px)
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 200 // Maximum height in pixels
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [description])

  useEffect(() => {
    if (!event) return

    if (isSubmitting) {
      wasSubmitting.current = true
      setAutoSaveStatus('saving')
    } else if (wasSubmitting.current) {
      wasSubmitting.current = false
      if (saveError) {
        setAutoSaveStatus('error')
      } else {
        setAutoSaveStatus('saved')
        const timer = setTimeout(() => setAutoSaveStatus('idle'), 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [isSubmitting, saveError, event])

  useEffect(() => {
    if (!event) return

    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (!title.trim()) return

    debounceRef.current = setTimeout(() => {
      onSubmitRef.current({
        type,
        title: title.trim(),
        nickname: nickname.trim() || undefined,
        depositAmount: depositAmount !== '' ? depositAmount : null,
        acumPaid,
        description: description.trim() || undefined,
        startDate,
        endDate,
        isAllDay,
        clientId,
        status,
        catering: catering || undefined,
        startTime,
        endTime,
        guestCountAdults: guestCountAdults !== '' ? guestCountAdults : null,
        guestCountChildren: guestCountChildren !== '' ? guestCountChildren : null,
      })
    }, 1000)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [type, title, nickname, depositAmount, acumPaid, description, startDate, endDate, isAllDay, clientId, status, catering, startTime, endTime, guestCountAdults, guestCountChildren]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch selected client details
  const { data: selectedClient } = trpc.clients.get.useQuery(
    { id: clientId! },
    {
      enabled: !!clientId
    }
  )

  // Update client mutation
  const updateClientMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      // Invalidate client queries to refresh data
      utils.clients.get.invalidate({ id: clientId! })
      utils.clients.search.invalidate()
      setShowClientForm(false)
    }
  })

  const effectiveSiteId = siteId ?? event?.siteId
  const { data: cateringOptions = [] } = trpc.events.getCateringOptions.useQuery(
    { siteId: effectiveSiteId! },
    { enabled: !!effectiveSiteId }
  )

  const handleUpdateClient = (formData: ClientFormData) => {
    if (!clientId) return

    updateClientMutation.mutate({
      id: clientId,
      ...formData
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    onSubmit({
      type,
      title: title.trim(),
      nickname: nickname.trim() || undefined,
      depositAmount: depositAmount !== '' ? depositAmount : null,
      acumPaid,
      description: description.trim() || undefined,
      startDate,
      endDate,
      isAllDay,
      clientId,
      status,
      catering: catering || undefined,
      startTime,
      endTime,
      guestCountAdults: guestCountAdults !== '' ? guestCountAdults : null,
      guestCountChildren: guestCountChildren !== '' ? guestCountChildren : null,
    })
  }

  const isValid = title.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Event Type Button Group */}
      <div className="space-y-2">
        <Label>{t('events.eventType')}</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={type === 'EVENT' ? 'default' : 'outline'}
            onClick={() => setType('EVENT')}
            disabled={!event && isSubmitting}
          >
            {t('events.event')}
          </Button>
          <Button
            type="button"
            variant={type === 'PRE_EVENT_MEETING' ? 'default' : 'outline'}
            onClick={() => setType('PRE_EVENT_MEETING')}
            disabled={!event && isSubmitting}
          >
            {t('events.preEventMeeting')}
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">{t('events.eventTitle')}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('events.eventTitle')}
          disabled={!event && isSubmitting}
        />
      </div>

      {/* Nickname */}
      <div className="space-y-2">
        <Label htmlFor="nickname">{t('events.eventNickname')}</Label>
        <Input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t('events.eventNickname')}
          disabled={!event && isSubmitting}
        />
      </div>

      {/* Client */}
      <div className="space-y-2">
        <Label htmlFor="client">{t('clients.client')}</Label>
        <ClientCombobox
          value={clientId}
          onValueChange={(value) => {
            setClientId(value)
            setShowClientForm(false) // Hide form when changing client
          }}
          disabled={!event && isSubmitting}
        />

        {/* Show Edit button when a client is selected */}
        {clientId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowClientForm(!showClientForm)}
            disabled={!event && isSubmitting}
          >
            {showClientForm && t('common.cancel')} {t('common.edit')} {t('clients.client')}
          </Button>
        )}
      </div>

      {/* Client Edit Form */}
      {showClientForm && selectedClient && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <h4 className="font-medium">{t('common.edit')} {t('clients.client')}</h4>
          <ClientForm
            client={selectedClient}
            onSubmit={handleUpdateClient}
            onCancel={() => setShowClientForm(false)}
            isSubmitting={updateClientMutation.isPending}
          />
        </div>
      )}

      {/* Date and Status in same row */}
      <div className={type === 'PRE_EVENT_MEETING' ? '' : 'grid grid-cols-2 gap-4'}>
        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date">{t('events.date')}</Label>
          <Input
            id="date"
            type={type === 'PRE_EVENT_MEETING' ? 'datetime-local' : 'date'}
            value={type === 'PRE_EVENT_MEETING'
              ? format(startDate, "yyyy-MM-dd'T'HH:mm")
              : format(startDate, 'yyyy-MM-dd')
            }
            onChange={(e) => setStartDate(new Date(e.target.value))}
            disabled={!event && isSubmitting}
          />
        </div>

        {/* Status - Only show for EVENT */}
        {type === 'EVENT' && (
          <div className="space-y-2">
            <Label htmlFor="status">{t('events.status')}</Label>
            <Select value={status} onValueChange={(value: any) => setStatus(value)} disabled={isSubmitting}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">{t('events.draft')}</SelectItem>
                <SelectItem value="SCHEDULED">{t('events.scheduled')}</SelectItem>
                <SelectItem value="CANCELLED">{t('events.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">{t('events.eventDescription')}</Label>
        <Textarea
          ref={descriptionRef}
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('events.eventDescription')}
          disabled={!event && isSubmitting}
          className="resize-none overflow-auto min-h-[80px] transition-height"
          style={{ height: '80px' }}
        />
      </div>

      {/* Deposit & ACUM */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="depositAmount">{t('events.depositAmount')}</Label>
          <Input
            id="depositAmount"
            type="number"
            min="0"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acumPaid">{t('events.acumPaid')}</Label>
          <div className="flex items-center h-10">
            <Checkbox
              id="acumPaid"
              checked={acumPaid}
              className="h-7 w-7"
              onCheckedChange={(checked) => setAcumPaid(checked === true)}
            />
          </div>
        </div>
      </div>

      {/* Catering, Times, Guest Counts */}
      <div className="space-y-4">
        {/* Catering */}
        <CateringInput
          label="קייטרינג"
          value={catering}
          onChange={setCatering}
          options={cateringOptions}
        />

        {/* Start & End Time */}
        <div className="grid grid-cols-2 gap-4">
          <TimeInput
            label="שעת התחלה"
            value={startTime}
            onChange={setStartTime}
          />
          <TimeInput
            label="שעת סיום"
            value={endTime}
            onChange={setEndTime}
            hint="לאחר חצות = יום למחרת"
          />
        </div>

        {/* Guest Counts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="guestCountAdults">מבוגרים</Label>
            <Input
              id="guestCountAdults"
              type="number"
              min="0"
              value={guestCountAdults}
              onChange={e => setGuestCountAdults(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guestCountChildren">ילדים</Label>
            <Input
              id="guestCountChildren"
              type="number"
              min="0"
              value={guestCountChildren}
              onChange={e => setGuestCountChildren(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      {event ? (
        <div className="flex justify-end h-9 items-center">
          {autoSaveStatus === 'saving' && (
            <span className="text-sm text-muted-foreground">{t('common.saving')}</span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-sm text-muted-foreground">{t('common.saved')}</span>
          )}
          {autoSaveStatus === 'error' && (
            <span className="text-sm text-destructive">{t('common.failedToSave')}</span>
          )}
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={!event && isSubmitting}
            >
              {t('common.cancel')}
            </Button>
          )}
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? t('common.loading') : t('common.create')}
          </Button>
        </div>
      )}
    </form>
  )
}