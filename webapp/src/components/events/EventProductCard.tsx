import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type EventProduct = RouterOutput['eventProducts']['list'][0]

interface EventProductCardProps {
  eventProduct: EventProduct
  onRemove: (id: string) => void
  isRemoving?: boolean
}

export function EventProductCard({ eventProduct, onRemove, isRemoving }: EventProductCardProps) {
  const product = eventProduct.product
  if (!product) return null

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
    <div className="flex items-center justify-between p-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{product.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatPrice(eventProduct.price || product.price, product.currency)}
          {eventProduct.quantity > 1 && ` × ${eventProduct.quantity}`}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(eventProduct.id)}
        disabled={isRemoving}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}