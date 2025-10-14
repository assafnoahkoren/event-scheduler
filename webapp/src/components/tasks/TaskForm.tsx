import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from 'react-i18next'

// Form schema matching createTaskSchema from backend (simplified for now)
const taskFormSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  eventId: z.string().uuid(),
  parentTaskId: z.string().uuid().optional(),
})

export type TaskFormData = z.infer<typeof taskFormSchema>

interface TaskFormProps {
  eventId: string
  parentTaskId?: string
  initialData?: Partial<TaskFormData>
  onSubmit: (data: TaskFormData) => void
  onCancel: () => void
  onDelete?: () => void
  isSubmitting?: boolean
  isDeleting?: boolean
}

export function TaskForm({
  eventId,
  parentTaskId,
  initialData,
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting = false,
  isDeleting = false,
}: TaskFormProps) {
  const { t } = useTranslation()

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      status: initialData?.status || 'PENDING',
      eventId,
      parentTaskId,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('tasks.titleLabel')}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('tasks.titlePlaceholder')} />
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
              <FormLabel>{t('tasks.descriptionLabel')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t('tasks.descriptionPlaceholder')}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('tasks.statusLabel')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('tasks.selectStatus')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PENDING">{t('tasks.status.pending')}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t('tasks.status.inprogress')}</SelectItem>
                  <SelectItem value="COMPLETED">{t('tasks.status.completed')}</SelectItem>
                  <SelectItem value="CANCELLED">{t('tasks.status.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-between">
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={isSubmitting || isDeleting}
            >
              {isDeleting ? t('common.deleting') : t('common.delete')}
            </Button>
          )}
          <div className="flex gap-2 ms-auto">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isDeleting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || isDeleting}>
              {isSubmitting ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
