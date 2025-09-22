import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { UserPlus } from 'lucide-react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Client = RouterOutput['clients']['get']

interface ClientFormProps {
  client?: Client | null
  initialName?: string
  onSubmit: (data: ClientFormData) => void
  onCancel?: () => void
  isSubmitting?: boolean
}

export interface ClientFormData {
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
}

export function ClientForm({
  client,
  initialName,
  onSubmit,
  onCancel,
  isSubmitting = false
}: ClientFormProps) {
  const { t } = useTranslation()

  // Form state
  const [name, setName] = useState(client?.name || initialName || '')
  const [email, setEmail] = useState(client?.email || '')
  const [phone, setPhone] = useState(client?.phone || '')
  const [address, setAddress] = useState(client?.address || '')
  const [notes, setNotes] = useState(client?.notes || '')

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()

    onSubmit({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined
    })
  }

  const isValid = name.trim().length > 0

  // Contact Picker API
  const handleImportContact = async () => {
    // Check if the Contact Picker API is supported
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      // API not supported, could show a message or fallback
      alert(t('clients.contactPickerNotSupported', 'Your browser does not support importing contacts'))
      return
    }

    try {
      // @ts-ignore - TypeScript doesn't have types for this API yet
      const props = ['name', 'tel']
      const opts = { multiple: false }

      // @ts-ignore
      const contacts = await navigator.contacts.select(props, opts)

      if (contacts && contacts.length > 0) {
        const contact = contacts[0]

        // Set name if available
        if (contact.name && contact.name.length > 0) {
          setName(contact.name[0])
        }

        // Set phone if available
        if (contact.tel && contact.tel.length > 0) {
          // Clean and format the phone number
          const phoneNumber = contact.tel[0].replace(/[^\d+]/g, '')
          setPhone(phoneNumber)
        }
      }
    } catch (error) {
      // User cancelled or error occurred
      console.error('Error selecting contact:', error)
    }
  }

  // Check if this is being used inside another form (like EventForm)
  const isNested = !!(onCancel && client)

  const FormWrapper = isNested ? 'div' : 'form'
  const formProps = isNested ? { className: "space-y-4" } : { onSubmit: handleSubmit, className: "space-y-4" }

  return (
    <FormWrapper {...formProps}>
      {/* Name */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="name">{t('clients.name')}</Label>
          {'contacts' in navigator && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleImportContact}
              disabled={isSubmitting}
              className="h-auto py-1 px-2 text-xs"
            >
              <UserPlus className="h-3 w-3 me-1" />
              {t('clients.importContact', 'Import Contact')}
            </Button>
          )}
        </div>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('clients.namePlaceholder')}
          disabled={isSubmitting}
          required
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">{t('clients.phone')}</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('clients.phonePlaceholder')}
          disabled={isSubmitting}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t('clients.notes')}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('clients.notesPlaceholder')}
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
          type={isNested ? "button" : "submit"}
          onClick={isNested ? () => handleSubmit() : undefined}
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? t('common.loading') : (client ? t('common.save') : t('common.create'))}
        </Button>
      </div>
    </FormWrapper>
  )
}