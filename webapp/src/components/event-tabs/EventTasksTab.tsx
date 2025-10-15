import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm, type TaskFormData } from '@/components/tasks/TaskForm'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
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
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Task = RouterOutput['tasks']['listForEvent'][0]

interface EventTasksTabProps {
  eventId: string
}

export function EventTasksTab({ eventId }: EventTasksTabProps) {
  const { t } = useTranslation()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [parentTaskId, setParentTaskId] = useState<string | undefined>()
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  const utils = trpc.useUtils()

  // Fetch tasks for the event
  const { data: tasks = [], isLoading } = trpc.tasks.listForEvent.useQuery(
    { eventId },
    { enabled: !!eventId }
  )

  // Create task mutation
  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.listForEvent.invalidate({ eventId })
      setIsFormOpen(false)
      setParentTaskId(undefined)
      toast.success(t('tasks.createSuccess'))
    },
    onError: (error) => {
      toast.error(error.message || t('tasks.createError'))
    },
  })

  // Update task mutation
  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.listForEvent.invalidate({ eventId })
      setIsFormOpen(false)
      setEditingTask(null)
      toast.success(t('tasks.updateSuccess'))
    },
    onError: (error) => {
      toast.error(error.message || t('tasks.updateError'))
    },
  })

  // Delete task mutation
  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.listForEvent.invalidate({ eventId })
      setDeletingTaskId(null)
      toast.success(t('tasks.deleteSuccess'))
    },
    onError: (error) => {
      toast.error(error.message || t('tasks.deleteError'))
    },
  })

  const handleSubmit = (data: TaskFormData) => {
    if (editingTask) {
      updateMutation.mutate({
        id: editingTask.id,
        title: data.title,
        description: data.description,
        status: data.status,
      })
    } else {
      createMutation.mutate({
        ...data,
        eventId,
        parentTaskId,
      })
    }
  }

  const handleToggleComplete = (taskId: string, newStatus: string) => {
    updateMutation.mutate({
      id: taskId,
      status: newStatus as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    })
  }

  const handleAddTask = () => {
    setEditingTask(null)
    setParentTaskId(undefined)
    setIsFormOpen(true)
  }

  const handleAddSubtask = (parentId: string) => {
    setEditingTask(null)
    setParentTaskId(parentId)
    setIsFormOpen(true)
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setParentTaskId(undefined)
    setIsFormOpen(true)
  }

  const handleDeleteClick = () => {
    if (editingTask) {
      setDeletingTaskId(editingTask.id)
    }
  }

  const confirmDelete = () => {
    if (deletingTaskId) {
      deleteMutation.mutate({ id: deletingTaskId })
    }
  }

  // Filter top-level tasks (tasks without parent)
  const topLevelTasks = tasks.filter((task) => !task.parentTaskId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className='border-none'>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-0">
          <CardTitle>{t('tasks.title')}</CardTitle>
          <Button onClick={handleAddTask} size="sm">
            <Plus className="h-4 w-4 me-2" />
            {t('tasks.addTask')}
          </Button>
        </CardHeader>
        <CardContent>
          {topLevelTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('tasks.noTasks')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topLevelTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onAddSubtask={handleAddSubtask}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Form Drawer */}
      <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {editingTask ? t('tasks.editTask') : parentTaskId ? t('tasks.addSubtask') : t('tasks.addTask')}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <TaskForm
              eventId={eventId}
              parentTaskId={parentTaskId}
              initialData={
                editingTask
                  ? {
                      title: editingTask.title,
                      description: editingTask.description || '',
                      status: editingTask.status,
                      eventId,
                    }
                  : undefined
              }
              onSubmit={handleSubmit}
              onCancel={() => {
                setIsFormOpen(false)
                setEditingTask(null)
                setParentTaskId(undefined)
              }}
              onDelete={editingTask ? handleDeleteClick : undefined}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
              isDeleting={deleteMutation.isPending}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTaskId} onOpenChange={() => setDeletingTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tasks.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tasks.confirmDeleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
