import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Plus, Package, Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { EventProductCard } from './EventProductCard'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Event = RouterOutput['events']['get']
type Product = RouterOutput['products']['list'][0]

interface EventProductSectionProps {
  event: Event
}

interface EventProduct {
  productId: string
  quantity: number
  price: number
}

export function EventProductSection({ event }: EventProductSectionProps) {
  const { t } = useTranslation()
  const utils = trpc.useUtils()
  const [eventProducts, setEventProducts] = useState<EventProduct[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [open, setOpen] = useState(false)

  // Get available products for the site
  const { data: products } = trpc.products.list.useQuery(
    { siteId: event.siteId },
    { enabled: !!event.siteId }
  )

  // Get existing event products
  const { data: existingEventProducts } = trpc.eventProducts.list.useQuery(
    { eventId: event.id },
    { enabled: !!event.id }
  )

  const addEventProductMutation = trpc.eventProducts.add.useMutation({
    onSuccess: () => {
      utils.eventProducts.list.invalidate({ eventId: event.id })
      toast.success(t('events.productAdded'))
    },
    onError: (error) => {
      console.error('Failed to add product:', error)
      toast.error(t('events.productError'))
    },
  })

  const removeEventProductMutation = trpc.eventProducts.remove.useMutation({
    onSuccess: () => {
      utils.eventProducts.list.invalidate({ eventId: event.id })
      toast.success(t('events.productRemoved'))
    },
    onError: (error) => {
      console.error('Failed to remove product:', error)
      toast.error(t('events.productError'))
    },
  })

  const handleAddProduct = () => {
    if (!selectedProductId) return

    const product = products?.find(p => p.id === selectedProductId)
    if (!product) return

    addEventProductMutation.mutate({
      eventId: event.id,
      productId: product.id,
      quantity: 1,
      price: product.price,
    })

    setSelectedProductId('')
    setOpen(false)
  }

  const handleRemoveProduct = (eventProductId: string) => {
    removeEventProductMutation.mutate({
      id: eventProductId,
    })
  }

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

  const activeProducts = products?.filter(p => p.isActive) || []
  // Allow adding the same product multiple times
  const availableProducts = activeProducts

  return (
    <div className="space-y-4">
      {/* Add Product Section */}
      {availableProducts.length > 0 && (
        <div className="flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="flex-1 justify-between"
              >
                {selectedProductId
                  ? availableProducts.find((product) => product.id === selectedProductId)?.name
                  : t('events.selectProduct')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              <Command>
                <CommandInput placeholder={t('products.searchProducts')} />
                <CommandList>
                  <CommandEmpty>{t('products.noProductsFound')}</CommandEmpty>
                  {availableProducts.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={() => {
                        setSelectedProductId(product.id === selectedProductId ? '' : product.id)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedProductId === product.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div>{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatPrice(product.price, product.currency)}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            onClick={handleAddProduct}
            disabled={!selectedProductId || addEventProductMutation.isPending}
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Products List */}
      {existingEventProducts && existingEventProducts.length > 0 ? (
        <div className="divide-y rounded-lg border">
          {existingEventProducts.map((eventProduct) => (
            <EventProductCard
              key={eventProduct.id}
              eventProduct={eventProduct}
              onRemove={handleRemoveProduct}
              isRemoving={removeEventProductMutation.isPending}
              onUpdate={() => utils.eventProducts.list.invalidate({ eventId: event.id })}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {t('events.noProductsAdded')}
          </p>
        </div>
      )}

      {/* Total Price */}
      {existingEventProducts && existingEventProducts.length > 0 && (
        <div className="border-t pt-3">
          <div className="flex justify-between items-center">
            <span className="font-medium">{t('events.total')}</span>
            <span className="text-lg font-bold">
              {formatPrice(
                existingEventProducts.reduce((sum, ep) => sum + ((ep.price || ep.product?.price || 0) * ep.quantity), 0),
                existingEventProducts[0]?.product?.currency || 'ILS'
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}