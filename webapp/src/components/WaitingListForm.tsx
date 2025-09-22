import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ClientCombobox } from '@/components/ClientCombobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { cn } from '@/lib/utils'

type RuleType = 'SPECIFIC_DATES' | 'DAY_OF_WEEK' | 'DATE_RANGE'

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

interface WaitingListFormProps {
  entry?: WaitingListEntry | null
  initialClientId?: string
  initialDate?: Date
  onSubmit: (data: WaitingListFormData) => void
  onCancel?: () => void
  isSubmitting?: boolean
}

export interface WaitingListFormData {
  clientId: string
  ruleType: RuleType
  specificDates?: string[]
  daysOfWeek?: number[]
  dateRange?: { start: string; end: string }
  expirationDate: string
  notes?: string
}

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export function WaitingListForm({
  entry,
  initialClientId,
  initialDate,
  onSubmit,
  onCancel,
  isSubmitting = false
}: WaitingListFormProps) {
  const { t } = useTranslation()

  // Form state
  const [clientId, setClientId] = useState(entry?.clientId || initialClientId || '')
  const [ruleType, setRuleType] = useState<RuleType>((entry?.ruleType as RuleType) || 'SPECIFIC_DATES')
  const [notes, setNotes] = useState(entry?.notes || '')

  // Date fields based on rule type
  const [specificDates, setSpecificDates] = useState<Date[]>(() => {
    if (entry && entry.specificDates) {
      const dates = entry.specificDates as any
      if (Array.isArray(dates)) {
        return dates.map((d: string) => new Date(d))
      }
    }
    return initialDate ? [initialDate] : []
  })

  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(() => {
    if (entry?.daysOfWeek) {
      const days = entry.daysOfWeek as any
      return Array.isArray(days) ? days : []
    }
    return []
  })

  const [dateRangeStart, setDateRangeStart] = useState<Date | undefined>(() => {
    if (entry?.dateRange) {
      const range = entry.dateRange as { start: string; end: string }
      return new Date(range.start)
    }
    return undefined
  })

  const [dateRangeEnd, setDateRangeEnd] = useState<Date | undefined>(() => {
    if (entry?.dateRange) {
      const range = entry.dateRange as { start: string; end: string }
      return new Date(range.end)
    }
    return undefined
  })

  const [expirationDate, setExpirationDate] = useState<Date | undefined>(() => {
    if (entry?.expirationDate) {
      return new Date(entry.expirationDate)
    }
    return addDays(new Date(), 30) // Default to 30 days from now
  })

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()

    const formData: WaitingListFormData = {
      clientId,
      ruleType,
      expirationDate: expirationDate?.toISOString() || new Date().toISOString(),
      notes: notes.trim() || undefined
    }

    // Add rule-specific data
    if (ruleType === 'SPECIFIC_DATES') {
      formData.specificDates = specificDates.map(d => d.toISOString().split('T')[0])
    } else if (ruleType === 'DAY_OF_WEEK') {
      formData.daysOfWeek = daysOfWeek
    } else if (ruleType === 'DATE_RANGE' && dateRangeStart && dateRangeEnd) {
      formData.dateRange = {
        start: dateRangeStart.toISOString().split('T')[0],
        end: dateRangeEnd.toISOString().split('T')[0]
      }
    }

    onSubmit(formData)
  }

  const isValid = () => {
    if (!clientId) return false
    if (!expirationDate) return false

    if (ruleType === 'SPECIFIC_DATES' && specificDates.length === 0) return false
    if (ruleType === 'DAY_OF_WEEK' && daysOfWeek.length === 0) return false
    if (ruleType === 'DATE_RANGE' && (!dateRangeStart || !dateRangeEnd)) return false

    return true
  }

  const toggleWeekday = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Client */}
      <div className="space-y-2">
        <Label htmlFor="client">{t('waitingList.client')}</Label>
        <ClientCombobox
          value={clientId}
          onValueChange={(value) => setClientId(value || '')}
          disabled={isSubmitting}
        />
      </div>

      {/* Rule Type */}
      <div className="space-y-2">
        <Label htmlFor="ruleType">{t('waitingList.ruleType')}</Label>
        <Select value={ruleType} onValueChange={(value) => setRuleType(value as RuleType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SPECIFIC_DATES">{t('waitingList.specificDates')}</SelectItem>
            <SelectItem value="DAY_OF_WEEK">{t('waitingList.daysOfWeek')}</SelectItem>
            <SelectItem value="DATE_RANGE">{t('waitingList.dateRange')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rule-specific fields */}
      {ruleType === 'SPECIFIC_DATES' && (
        <div className="space-y-2">
          <Label>{t('waitingList.selectDates')}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !specificDates.length && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="me-2 h-4 w-4" />
                {specificDates.length > 0
                  ? `${specificDates.length} ${t('waitingList.datesSelected')}`
                  : t('waitingList.pickDates')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="multiple"
                selected={specificDates}
                onSelect={(dates) => setSpecificDates(dates || [])}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {specificDates.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {specificDates.map(d => format(d, 'PPP')).join(', ')}
            </div>
          )}
        </div>
      )}

      {ruleType === 'DAY_OF_WEEK' && (
        <div className="space-y-2">
          <Label>{t('waitingList.selectWeekdays')}</Label>
          <div className="grid grid-cols-7 gap-2">
            {WEEKDAYS.map(day => (
              <Button
                key={day.value}
                type="button"
                variant={daysOfWeek.includes(day.value) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleWeekday(day.value)}
                disabled={isSubmitting}
              >
                {day.label.slice(0, 2)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {ruleType === 'DATE_RANGE' && (
        <div className="space-y-2">
          <Label>{t('waitingList.dateRangeLabel')}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateRangeStart && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="me-2 h-4 w-4" />
                  {dateRangeStart ? format(dateRangeStart, 'PPP') : t('waitingList.startDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRangeStart}
                  onSelect={setDateRangeStart}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateRangeEnd && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="me-2 h-4 w-4" />
                  {dateRangeEnd ? format(dateRangeEnd, 'PPP') : t('waitingList.endDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRangeEnd}
                  onSelect={setDateRangeEnd}
                  disabled={(date) => dateRangeStart ? date < dateRangeStart : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Expiration Date */}
      <div className="space-y-2">
        <Label>{t('waitingList.expirationDate')}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !expirationDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="me-2 h-4 w-4" />
              {expirationDate ? format(expirationDate, 'PPP') : t('waitingList.selectExpiration')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={expirationDate}
              onSelect={setExpirationDate}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t('waitingList.notes')}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('waitingList.notesPlaceholder')}
          disabled={isSubmitting}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
        )}
        <Button
          type="submit"
          disabled={!isValid() || isSubmitting}
        >
          {isSubmitting ? t('common.loading') : (entry ? t('common.save') : t('common.create'))}
        </Button>
      </div>
    </form>
  )
}