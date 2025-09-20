import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Product = RouterOutput['products']['get']

export interface ProductFormData {
  name: string
  description: string
  type: 'SERVICE' | 'PHYSICAL' | 'EXTERNAL_SERVICE'
  price: number
  currency: string
  isActive: boolean
}

interface ProductFormProps {
  product?: Product | null
  onSubmit: (data: ProductFormData) => void
  onCancel?: () => void
  isSubmitting?: boolean
}

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
]

export function ProductForm({ product, onSubmit, onCancel, isSubmitting }: ProductFormProps) {
  const { t } = useTranslation()

  const [formData, setFormData] = useState<ProductFormData>({
    name: product?.name || '',
    description: product?.description || '',
    type: product?.type || 'SERVICE',
    price: product?.price || 0,
    currency: product?.currency || 'ILS',
    isActive: product?.isActive ?? true,
  })

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        type: product.type,
        price: product.price,
        currency: product.currency,
        isActive: product.isActive,
      })
    }
  }, [product])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handlePriceChange = (value: string) => {
    const price = parseFloat(value) || 0
    setFormData({ ...formData, price })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Product Name */}
      <div className="space-y-2">
        <Label htmlFor="name">{t('products.productName')}</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t('products.productNamePlaceholder')}
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">{t('products.productDescription')}</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder={t('products.productDescriptionPlaceholder')}
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      {/* Product Type */}
      <div className="space-y-2">
        <Label htmlFor="type">{t('products.productType')}</Label>
        <Select
          value={formData.type}
          onValueChange={(value: 'SERVICE' | 'PHYSICAL' | 'EXTERNAL_SERVICE') =>
            setFormData({ ...formData, type: value })
          }
          disabled={isSubmitting}
        >
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SERVICE">{t('products.service')}</SelectItem>
            <SelectItem value="PHYSICAL">{t('products.physical')}</SelectItem>
            <SelectItem value="EXTERNAL_SERVICE">{t('products.externalService')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price and Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">{t('products.price')}</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder={t('products.pricePlaceholder')}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">{t('products.currency')}</Label>
          <Select
            value={formData.currency}
            onValueChange={(value) => setFormData({ ...formData, currency: value })}
            disabled={isSubmitting}
          >
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.symbol} {curr.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Status */}
      <div className="flex items-center gap-2">
        <Switch
          id="active"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          disabled={isSubmitting}
        />
        <Label htmlFor="active" className="text-sm font-normal">
          {formData.isActive ? t('products.active') : t('products.inactive')}
        </Label>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? t('products.savingProduct') : t('products.saveProduct')}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}