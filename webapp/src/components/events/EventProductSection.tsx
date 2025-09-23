import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { trpc } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Plus, Package, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { EventProductCard } from './EventProductCard'
import { ProductSelectionDrawer } from './ProductSelectionDrawer'
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
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const [eventProducts, setEventProducts] = useState<EventProduct[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Get available products for the site
  const { data: products } = trpc.products.list.useQuery(
    { siteId: event.siteId },
    { enabled: !!event.siteId }
  )

  // Get existing event products
  const { data: existingEventProducts } = trpc.eventProducts.list.useQuery(
    { eventId: event.id },
    {
      enabled: !!event.id,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  )

  const addEventProductMutation = trpc.eventProducts.add.useMutation({
    onSuccess: () => {
      utils.eventProducts.list.invalidate({ eventId: event.id })
    },
    onError: (error) => {
      console.error('Failed to add product:', error)
      toast.error(t('events.productError'))
    },
  })

  const removeEventProductMutation = trpc.eventProducts.remove.useMutation({
    onSuccess: () => {
      utils.eventProducts.list.invalidate({ eventId: event.id })
    },
    onError: (error) => {
      console.error('Failed to remove product:', error)
      toast.error(t('events.productError'))
    },
  })

  const handleAddProduct = (product: Product) => {
    addEventProductMutation.mutate({
      eventId: event.id,
      productId: product.id,
      quantity: 1,
      price: product.price,
    })
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
      {/* Check if there are no products in the site at all */}
      {products && products.length === 0 ? (
        <div className="text-center py-8 space-y-4">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t('events.noProductsInSite')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('events.createProductsFirst')}
            </p>
          </div>
          <Button
            onClick={() => navigate('/products')}
            variant="default"
          >
            <ArrowRight className="h-4 w-4 me-2" />
            {t('events.goToProducts')}
          </Button>
        </div>
      ) : (
        <>
          {/* Add Product Button */}
          {availableProducts.length > 0 && (
            <Button
              onClick={() => setDrawerOpen(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 me-2" />
              {t('products.addProduct')}
            </Button>
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
                  onUpdate={() => {
                    // Invalidate in the background without causing re-render
                    utils.eventProducts.list.invalidate({ eventId: event.id })
                  }}
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
        </>
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

      {/* Product Selection Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('products.selectProducts')}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            <ProductSelectionDrawer
              products={availableProducts}
              onProductAdd={handleAddProduct}
              isAdding={addEventProductMutation.isPending}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}