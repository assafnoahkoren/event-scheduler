import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/utils/trpc'
import { useCurrentOrg } from '@/contexts/CurrentOrgContext'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type ServiceCategory = RouterOutput['serviceProviders']['listCategories'][0]

interface CategorySelectProps {
  value?: string
  onValueChange: (value: string | undefined) => void
  disabled?: boolean
  placeholder?: string
  excludeCategoryIds?: string[] // Categories to exclude from the list
  allowClear?: boolean
  label?: string
  helperText?: string
  required?: boolean
  className?: string
}

export function CategorySelect({
  value,
  onValueChange,
  disabled = false,
  placeholder,
  excludeCategoryIds = [],
  allowClear = false,
  label,
  helperText,
  required = false,
  className = '',
}: CategorySelectProps) {
  const { t } = useTranslation()
  const { currentOrg } = useCurrentOrg()

  // Fetch categories
  const { data: categories = [] } = trpc.serviceProviders.listCategories.useQuery(
    { organizationId: currentOrg?.id || '' },
    { enabled: !!currentOrg?.id }
  )

  // Filter out excluded categories
  const availableCategories = categories.filter(
    (category) => !excludeCategoryIds.includes(category.id)
  )

  const CLEAR_VALUE = '__CLEAR__'

  const handleValueChange = (selectedValue: string) => {
    if (selectedValue === CLEAR_VALUE && allowClear) {
      onValueChange(undefined)
    } else {
      onValueChange(selectedValue)
    }
  }

  return (
    <div className={className}>
      {label && (
        <label className="text-sm font-medium mb-2 block">
          {label} {required && '*'} {!required && `(${t('common.optional')})`}
        </label>
      )}
      <Select
        value={value || ''}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder || t('serviceProviders.selectCategory')} />
        </SelectTrigger>
        <SelectContent>
          {allowClear && value && (
            <SelectItem value={CLEAR_VALUE}>
              <span className="text-gray-500">{t('common.clear')}</span>
            </SelectItem>
          )}
          {availableCategories.length === 0 ? (
            <div className="px-2 py-1 text-sm text-gray-500">
              {t('serviceProviders.noAvailableCategories')}
            </div>
          ) : (
            availableCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {helperText && (
        <p className="text-xs text-gray-500 mt-1">
          {helperText}
        </p>
      )}
    </div>
  )
}