import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface WhatsAppButtonProps {
  phone?: string | null
  disabled?: boolean
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary'
  className?: string
}

export function WhatsAppButton({
  phone,
  disabled = false,
  size = 'icon',
  variant = 'outline',
  className
}: WhatsAppButtonProps) {
  const { t } = useTranslation()

  const handleWhatsApp = () => {
    if (phone) {
      // Remove non-numeric characters and add country code if needed
      const phoneNumber = phone.replace(/\D/g, '')
      window.open(`https://wa.me/${phoneNumber}`, '_blank')
    }
  }

  const hasPhone = !!phone

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleWhatsApp}
      disabled={disabled || !hasPhone}
      title={t('clients.whatsappMessage')}
      className={cn(
        hasPhone && "hover:bg-green-50 hover:text-green-600 hover:border-green-300",
        className
      )}
    >
      <MessageCircle className={cn(
        "h-4 w-4",
        hasPhone ? "text-green-600" : "text-muted-foreground"
      )} />
    </Button>
  )
}