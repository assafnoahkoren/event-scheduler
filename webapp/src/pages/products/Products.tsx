import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { ProductCard } from '@/components/products/ProductCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Package } from 'lucide-react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Product = RouterOutput['products']['list'][0]

export function Products() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentSite } = useCurrentSite()
  const [searchQuery, setSearchQuery] = useState('')

  const { data: products, isLoading, error } = trpc.products.list.useQuery(
    currentSite ? { siteId: currentSite.id } : {},
    { enabled: !!currentSite }
  )

  const handleEdit = (product: Product) => {
    navigate(`/products/${product.id}`)
  }


  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-muted-foreground">{t('common.error')}</p>
          <p className="text-sm text-red-600 mt-2">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t('products.products')}</h1>

        {/* Search and Add button */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('products.searchProducts')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => navigate('/products/new')} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-muted-foreground">{t('common.loading')}</div>
        </div>
      ) : filteredProducts?.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery ? t('products.noProductsFound') : t('products.noProducts')}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {searchQuery ? t('products.tryAdjustingSearch') : t('products.noProductsDescription')}
          </p>
          {!searchQuery && (
            <Button onClick={() => navigate('/products/new')}>
              <Plus className="h-4 w-4 me-2" />
              {t('products.createProduct')}
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {filteredProducts?.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

    </div>
  )
}