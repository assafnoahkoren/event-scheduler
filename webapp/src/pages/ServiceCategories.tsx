import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import { Plus, Trash2, ArrowLeft, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import {
  CSS,
} from '@dnd-kit/utilities'
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

function SortableCategoryItem({
  category,
  onUpdate,
  onDelete,
  disabled,
}: {
  category: ServiceCategory
  onUpdate: (category: ServiceCategory, newName: string) => void
  onDelete: (category: ServiceCategory) => void
  disabled: boolean
}) {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action()
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2  bg-white"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="w-4 h-4" />
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

  const updateOrdersMutation = trpc.serviceProviders.updateCategoryOrders.useMutation()

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !currentOrg?.id) {
      return
    }

    const oldIndex = categories.findIndex(category => category.id === active.id)
    const newIndex = categories.findIndex(category => category.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedCategories = arrayMove(categories, oldIndex, newIndex)

      // Update the orders based on the new positions
      const updates = reorderedCategories.map((category, index) => ({
        categoryId: category.id,
        order: index
      }))

      // Optimistic update
      utils.serviceProviders.listCategories.setData(
        { organizationId: currentOrg.id },
        reorderedCategories
      )

      // Perform the actual mutation
      updateOrdersMutation.mutate(updates, {
        onError: () => {
          // Revert on error
          utils.serviceProviders.listCategories.invalidate({ organizationId: currentOrg.id })
        }
      })
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {categories.map((category) => (
                <SortableCategoryItem
                  key={category.id}
                  category={category}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  disabled={updateMutation.isPending || updateOrdersMutation.isPending}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

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