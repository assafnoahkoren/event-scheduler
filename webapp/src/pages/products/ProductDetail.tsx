import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { ProductForm, type ProductFormData } from '@/components/products/ProductForm'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

export function ProductDetail() {
  const { productId } = useParams<{ productId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: product, isLoading, error } = trpc.products.get.useQuery(
    { id: productId || '' },
    { enabled: !!productId }
  )

  const utils = trpc.useUtils()

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      utils.products.get.invalidate({ id: productId })
      utils.products.list.invalidate()
      navigate('/products')
    },
    onError: (error) => {
      console.error('Failed to update product:', error)
      toast.error(t('products.productError'))
    },
  })

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      navigate('/products')
    },
    onError: (error) => {
      console.error('Failed to delete product:', error)
      toast.error(t('products.productError'))
    },
  })

  const handleSubmit = (formData: ProductFormData) => {
    if (!productId) return

    updateMutation.mutate({
      id: productId,
      ...formData,
    })
  }

  const handleCancel = () => {
    navigate('/products')
  }

  const handleDelete = () => {
    if (productId) {
      deleteMutation.mutate({ id: productId })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            {error ? 'Error loading product' : 'Product not found'}
          </h2>
          {error && <p className="text-muted-foreground">{error.message}</p>}
          <Button onClick={() => navigate('/products')} className="mt-4">
            <ArrowLeft className="h-4 w-4 me-2" />
            {t('common.back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pb-6 max-w-lg">
      <div className="bg-background rounded-lg p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('products.editProduct')}</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <ProductForm
          product={product}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={updateMutation.isPending}
        />
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('products.confirmDeleteProduct')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('products.confirmDeleteProductDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('common.loading') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}