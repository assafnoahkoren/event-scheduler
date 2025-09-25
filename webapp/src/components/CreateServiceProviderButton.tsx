import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ServiceCategory = RouterOutput['serviceProviders']['listCategories'][0]

interface CreateServiceProviderButtonProps {
  category?: ServiceCategory | null
  onClick: (categoryId?: string) => void
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'sm' | 'lg' | 'icon'
  className?: string
  showText?: boolean
}

export function CreateServiceProviderButton({
  category,
  onClick,
  variant = 'ghost',
  size = 'sm',
  className = '',
  showText = true,
}: CreateServiceProviderButtonProps) {
  const { t } = useTranslation()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation() // Prevent accordion toggle when clicking the button
    onClick(category?.id)
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={className}
    >
      <Plus className="w-4 h-4" />
      {showText && (
        <span className="ms-2">
          {category
            ? t('serviceProviders.addProviderToCategory', { category: category.name })
            : t('serviceProviders.addProvider')
          }
        </span>
      )}
    </Button>
  )
}