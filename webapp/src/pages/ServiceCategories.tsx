import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ServiceCategory = RouterOutput['serviceProviders']['listCategories'][0]

function NewCategoryInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder: string
  className?: string
}) {
  const { t } = useTranslation()

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit()
    }
  }

  return (
    <div className={`flex items-center gap-2 p-2 ${className}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className="flex-1"
        disabled={disabled}
      />
      <Button
        onClick={onSubmit}
        disabled={!value.trim() || disabled}
        size="sm"
      >
        <Plus className="w-4 h-4 me-2" />
        {t('common.add')}
      </Button>
    </div>
  )
}

export function ServiceCategories() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentOrg } = useCurrentOrg()
  const [newCategoryName, setNewCategoryName] = useState('')

  const utils = trpc.useUtils()

  // Fetch categories
  const { data: categories = [], isLoading } = trpc.serviceProviders.listCategories.useQuery(
    { organizationId: currentOrg?.id || '' },
    { enabled: !!currentOrg?.id }
  )

  // Mutations
  const createMutation = trpc.serviceProviders.createCategory.useMutation({
    onSuccess: () => {
      utils.serviceProviders.listCategories.invalidate()
      setNewCategoryName('')
    },
  })

  const updateMutation = trpc.serviceProviders.updateCategory.useMutation({
    onSuccess: () => {
      utils.serviceProviders.listCategories.invalidate()
    },
  })

  const deleteMutation = trpc.serviceProviders.deleteCategory.useMutation({
    onSuccess: () => {
      utils.serviceProviders.listCategories.invalidate()
    },
  })

  const handleCreate = () => {
    if (!currentOrg?.id || !newCategoryName.trim()) return

    createMutation.mutate({
      organizationId: currentOrg.id,
      name: newCategoryName.trim(),
    })
  }

  const handleUpdate = (category: ServiceCategory, newName: string) => {
    if (!newName.trim() || newName === category.name) return

    updateMutation.mutate({
      categoryId: category.id,
      name: newName.trim(),
    })
  }

  const handleDelete = (category: ServiceCategory) => {
    if (confirm(t('serviceCategories.confirmDelete', { name: category.name }))) {
      deleteMutation.mutate({ categoryId: category.id })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action()
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <p>{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pt-4 px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">{t('serviceCategories.title')}</h1>
        </div>
      </div>

      {/* Categories List */}
      <div className="px-4">
        {/* Add new category at top */}
        <NewCategoryInput
          value={newCategoryName}
          onChange={setNewCategoryName}
          onSubmit={handleCreate}
          disabled={createMutation.isPending}
          placeholder={t('serviceCategories.newCategoryPlaceholder')}
        />

        <div>
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2 p-2">
              <Input
                value={category.name}
                onChange={(e) => handleUpdate(category, e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, () => handleUpdate(category, e.currentTarget.value))}
                onBlur={(e) => handleUpdate(category, e.target.value)}
                className="flex-1 me-2"
                disabled={updateMutation.isPending}
              />
              <span className="text-sm text-gray-500 min-w-fit">
                {category._count.providers} {t('serviceProviders.providers')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(category)}
                disabled={deleteMutation.isPending || category._count.providers > 0}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {/* Add new category at bottom */}
          <NewCategoryInput
            value={newCategoryName}
            onChange={setNewCategoryName}
            onSubmit={handleCreate}
            disabled={createMutation.isPending}
            placeholder={t('serviceCategories.newCategoryPlaceholder')}
            className="mb-4"
          />
        </div>

        {categories.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">{t('serviceCategories.noCategories')}</p>
            <p className="text-sm text-gray-400">{t('serviceCategories.getStarted')}</p>
          </div>
        )}
      </div>
    </div>
  )
}