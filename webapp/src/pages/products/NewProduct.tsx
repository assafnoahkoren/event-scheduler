import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { ProductForm, type ProductFormData } from '@/components/products/ProductForm'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function NewProduct() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentSite } = useCurrentSite()
  const utils = trpc.useUtils()

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate()
      navigate('/products')
    },
    onError: (error) => {
      console.error('Failed to create product:', error)
      toast.error(t('products.productError'))
    },
  })

  const handleSubmit = (formData: ProductFormData) => {
    if (currentSite) {
      createMutation.mutate({
        ...formData,
        siteId: currentSite.id,
      })
    }
  }

  const handleCancel = () => {
    navigate('/products')
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <div className="bg-background rounded-lg">
        <h1 className="text-xl font-bold mb-6">{t('products.newProduct')}</h1>

        <ProductForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createMutation.isPending}
        />
      </div>
    </div>
  )
}