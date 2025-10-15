import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from 'react-i18next'

const paymentFormSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().min(1, 'Currency is required'),
  description: z.string().optional(),
  paymentDate: z.string().datetime().optional(),
  paymentMethod: z.string().optional(),
})

export type PaymentFormData = z.infer<typeof paymentFormSchema>

interface PaymentFormProps {
  initialData?: {
    amount: number
    currency: string
    description?: string
    paymentDate?: string
    paymentMethod?: string
  }
  onSubmit: (data: PaymentFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function PaymentForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: PaymentFormProps) {
  const { t } = useTranslation()

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: initialData || {
      amount: 0,
      currency: 'USD',
      description: '',
      paymentDate: new Date().toISOString(),
      paymentMethod: '',
    },
  })

  const handleSubmit = (data: PaymentFormData) => {
    onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('payments.amount')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={t('payments.amountPlaceholder')}
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('payments.currency')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="ILS">ILS (₪)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('payments.paymentMethod')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('payments.paymentMethodPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('payments.paymentDate')}</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                  value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString()
                    field.onChange(date)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('payments.description')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('payments.descriptionPlaceholder')}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
