import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type EventProduct = RouterOutput['eventProducts']['list'][0]

interface EventProductCardProps {
  eventProduct: EventProduct
  onRemove: (id: string) => void
  isRemoving?: boolean
  onUpdate?: () => void
}

export function EventProductCard({ eventProduct, onRemove, isRemoving, onUpdate }: EventProductCardProps) {
  const { t } = useTranslation()
  const utils = trpc.useUtils()
  const product = eventProduct.product
  const [quantity, setQuantity] = useState(eventProduct.quantity)
  const [priceOverride, setPriceOverride] = useState(eventProduct.price || '')

  const updateMutation = trpc.eventProducts.update.useMutation({
    onSuccess: () => {
      if (onUpdate) onUpdate()
      utils.eventProducts.list.invalidate()
    },
    onError: (error) => {
      console.error('Failed to update product:', error)
      toast.error(t('events.updateError'))
      // Reset to original values on error
      setQuantity(eventProduct.quantity)
      setPriceOverride(eventProduct.price || '')
    },
  })

  useEffect(() => {
    setQuantity(eventProduct.quantity)
    setPriceOverride(eventProduct.price || '')
  }, [eventProduct.quantity, eventProduct.price])

  if (!product) return null

  const handleQuantityChange = (value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue > 0) {
      setQuantity(numValue)
      updateMutation.mutate({
        id: eventProduct.id,
        quantity: numValue,
      })
    }
  }

  const handlePriceChange = (value: string) => {
    if (value === '') {
      setPriceOverride('')
      // Send null to clear the price override
      updateMutation.mutate({
        id: eventProduct.id,
        price: null,
      })
    } else {
      const numValue = parseFloat(value)
      if (!isNaN(numValue) && numValue >= 0) {
        setPriceOverride(numValue)
        updateMutation.mutate({
          id: eventProduct.id,
          price: numValue,
        })
      }
    }
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-medium">{product.name}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(eventProduct.id)}
          disabled={isRemoving}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">{t('products.quantity')}:</span>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="w-12 pe-1"
            min="1"
            step="1"
            disabled={updateMutation.isPending}
          />
        </div>
        <span className="text-sm text-muted-foreground">×</span>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">{t('products.price')}:</span>
          <Input
            type="number"
            value={priceOverride}
            onChange={(e) => handlePriceChange(e.target.value)}
            className="w-24"
            min="0"
            step="0.01"
            placeholder={product.price.toString()}
            disabled={updateMutation.isPending}
          />
          <span className="text-sm text-muted-foreground">{product.currency}</span>
        </div>
      </div>
    </div>
  )
}