import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ContactImportButtonProps {
  onContactImported: (contact: { name?: string; phone?: string }) => void
  disabled?: boolean
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'sm' | 'lg' | 'icon'
  className?: string
}

export function ContactImportButton({
  onContactImported,
  disabled = false,
  variant = 'ghost',
  size = 'sm',
  className = 'h-auto py-1 px-2 text-xs'
}: ContactImportButtonProps) {
  const { t } = useTranslation()

  const handleImportContact = async () => {
    // Check if the Contact Picker API is supported
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      // API not supported, could show a message or fallback
      alert(t('clients.contactPickerNotSupported'))
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
        const importedContact: { name?: string; phone?: string } = {}

        // Set name if available
        if (contact.name && contact.name.length > 0) {
          importedContact.name = contact.name[0]
        }

        // Set phone if available
        if (contact.tel && contact.tel.length > 0) {
          // Clean and format the phone number
          importedContact.phone = contact.tel[0].replace(/[^\d+]/g, '')
        }

        onContactImported(importedContact)
      }
    } catch (error) {
      // User cancelled or error occurred
      console.error('Error selecting contact:', error)
    }
  }

  // Only show button if Contact Picker API is supported
  if (!('contacts' in navigator)) {
    return null
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleImportContact}
      disabled={disabled}
      className={className}
    >
      <UserPlus className="h-3 w-3 me-1" />
      {t('clients.importContact')}
    </Button>
  )
}