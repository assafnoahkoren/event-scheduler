import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Product = RouterOutput['products']['list'][0]

interface ProductSelectionDrawerProps {
  products: Product[]
  onProductAdd: (product: Product) => void
  isAdding?: boolean
}

export function ProductSelectionDrawer({
  products,
  onProductAdd,
  isAdding = false
}: ProductSelectionDrawerProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')

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

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('products.searchProducts')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-10"
        />
      </div>

      {/* Products List */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? t('products.noProductsFound') : t('products.noActiveProducts')}
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium">{product.name}</div>
                {product.description && (
                  <div className="text-sm text-muted-foreground truncate">
                    {product.description}
                  </div>
                )}
                <div className="text-sm font-medium mt-1">
                  {formatPrice(product.price, product.currency)}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onProductAdd(product)}
                disabled={isAdding}
                className="ms-2"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}