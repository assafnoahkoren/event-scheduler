import { useTranslation } from 'react-i18next'
import { Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Product = RouterOutput['products']['list'][0]

interface ProductCardProps {
  product: Product
  onEdit: (product: Product) => void
}

export function ProductCard({ product, onEdit }: ProductCardProps) {
  const { t } = useTranslation()

  const formatPrice = (price: number, currency: string) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(price)
    } catch {
      return `${currency} ${price.toFixed(2)}`
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{product.name}</h3>
          {!product.isActive && (
            <span className="text-xs text-muted-foreground">({t('products.inactive')})</span>
          )}
        </div>
        {product.description && (
          <p className="text-sm text-muted-foreground truncate mt-1">{product.description}</p>
        )}
        <p className="text-sm font-medium mt-1">{formatPrice(product.price, product.currency)}</p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(product)}
      >
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  )
}