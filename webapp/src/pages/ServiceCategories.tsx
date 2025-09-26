import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { Plus, Trash2, ArrowLeft, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
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

function DraggableCategoryItem({
  category,
  onUpdate,
  onDelete,
  disabled,
  index,
}: {
  category: ServiceCategory
  onUpdate: (category: ServiceCategory, newName: string) => void
  onDelete: (category: ServiceCategory) => void
  disabled: boolean
  index: number
}) {
  const { t } = useTranslation()

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action()
    }
  }

  return (
    <Draggable draggableId={category.id} index={index} isDragDisabled={disabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`flex items-center gap-2 p-2 bg-white border rounded-md mb-2 ${
            snapshot.isDragging ? 'shadow-lg' : ''
          }`}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.8 : 1,
          }}
        >
          <div
            {...provided.dragHandleProps}
            className="cursor-grab active:cursor-grabbing p-2 text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="w-5 h-5" />
          </div>
          <Input
            value={category.name}
            onChange={(e) => onUpdate(category, e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, () => onUpdate(category, e.currentTarget.value))}
            onBlur={(e) => onUpdate(category, e.target.value)}
            className="flex-1 me-2"
            disabled={disabled}
          />
          <span className="text-sm text-gray-500 min-w-fit">
            {category._count.providers} {t('serviceProviders.providers')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(category)}
            disabled={disabled}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Draggable>
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
    onSuccess: (newCategory) => {
      // Optimistic update for create
      if (currentOrg?.id) {
        utils.serviceProviders.listCategories.setData(
          { organizationId: currentOrg.id },
          (oldData) => oldData ? [...oldData, newCategory] : [newCategory]
        )
      }
      setNewCategoryName('')
    },
  })

  const updateMutation = trpc.serviceProviders.updateCategory.useMutation({
    onSuccess: (updatedCategory) => {
      // Optimistic update for category name changes
      if (currentOrg?.id) {
        utils.serviceProviders.listCategories.setData(
          { organizationId: currentOrg.id },
          (oldData) =>
            oldData?.map(cat =>
              cat.id === updatedCategory.id ? updatedCategory : cat
            ) ?? []
        )
      }
    },
  })

  const deleteMutation = trpc.serviceProviders.deleteCategory.useMutation({
    onSuccess: (_, variables) => {
      // Optimistic update for delete
      if (currentOrg?.id) {
        utils.serviceProviders.listCategories.setData(
          { organizationId: currentOrg.id },
          (oldData) => oldData?.filter(cat => cat.id !== variables.categoryId) ?? []
        )
      }
    },
  })

  const updateOrdersMutation = trpc.serviceProviders.updateCategoryOrders.useMutation()

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
    if (category._count.providers > 0) {
      alert(t('serviceCategories.cannotDeleteWithProviders', {
        name: category.name,
        count: category._count.providers
      }))
      return
    }

    if (confirm(t('serviceCategories.confirmDelete', { name: category.name }))) {
      deleteMutation.mutate({ categoryId: category.id })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action()
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !currentOrg?.id) {
      return
    }

    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    if (sourceIndex === destinationIndex) {
      return
    }

    // Reorder the categories array
    const reorderedCategories = Array.from(categories)
    const [removed] = reorderedCategories.splice(sourceIndex, 1)
    reorderedCategories.splice(destinationIndex, 0, removed)

    // Update order values
    const updatedCategories = reorderedCategories.map((category, index) => ({
      ...category,
      order: index
    }))

    // Optimistic update - set the new data immediately
    utils.serviceProviders.listCategories.setData(
      { organizationId: currentOrg.id },
      updatedCategories
    )

    // Prepare updates for server
    const updates = updatedCategories.map((category) => ({
      categoryId: category.id,
      order: category.order
    }))

    // Perform the actual mutation
    updateOrdersMutation.mutate(updates, {
      onError: () => {
        // Revert on error by refetching from server
        utils.serviceProviders.listCategories.invalidate({ organizationId: currentOrg.id })
      }
    })
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

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="categories">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {categories.map((category, index) => (
                  <DraggableCategoryItem
                    key={category.id}
                    category={category}
                    index={index}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    disabled={updateMutation.isPending || updateOrdersMutation.isPending}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Add new category at bottom */}
        <NewCategoryInput
          value={newCategoryName}
          onChange={setNewCategoryName}
          onSubmit={handleCreate}
          disabled={createMutation.isPending}
          placeholder={t('serviceCategories.newCategoryPlaceholder')}
          className="mb-4 mt-4"
        />

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