import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface PhoneCallButtonProps {
  phone?: string | null
  disabled?: boolean
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary'
  className?: string
}

export function PhoneCallButton({
  phone,
  disabled = false,
  size = 'icon',
  variant = 'outline',
  className
}: PhoneCallButtonProps) {
  const { t } = useTranslation()

  const handlePhoneCall = () => {
    if (phone) {
      window.location.href = `tel:${phone}`
    }
  }

  const hasPhone = !!phone

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePhoneCall}
      disabled={disabled || !hasPhone}
      title={t('clients.phoneCall')}
      className={cn(
        hasPhone && "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300",
        className
      )}
    >
      <Phone className={cn(
        "h-4 w-4",
        hasPhone ? "text-blue-600" : "text-muted-foreground"
      )} />
    </Button>
  )
}