import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Task = RouterOutput['tasks']['listForEvent'][0]

interface TaskCardProps {
  task: Task
  onToggleComplete: (taskId: string, currentStatus: string) => void
  onAddSubtask: (parentTaskId: string) => void
  onEdit: (task: Task) => void
  level?: number
}

export function TaskCard({
  task,
  onToggleComplete,
  onAddSubtask,
  onEdit,
  level = 0,
}: TaskCardProps) {
  const { t } = useTranslation()

  const isCompleted = task.status === 'COMPLETED'
  const isPending = task.status === 'PENDING'

  const handleCheckboxChange = (checked: boolean) => {
    const newStatus = checked ? 'COMPLETED' : 'PENDING'
    onToggleComplete(task.id, newStatus)
  }

  return (
    <div className="space-y-2">
      <Card className={level > 0 ? 'ms-6 relative' : 'relative'}>
        <CardContent className="p-4 cursor-pointer" onClick={() => onEdit(task)}>
          <div className="flex items-start gap-3">
            {/* Checkbox for quick complete/pending toggle */}
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isCompleted}
                onCheckedChange={handleCheckboxChange}
                className="mt-1 absolute -start-2 bg-white"
                style={{zoom: 1.6}}
              />
            </div>

            {/* Task content */}
            <div className="flex-1 min-w-0">
              <h4
                className={`font-medium ${
                  isCompleted ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {task.title}
              </h4>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
              )}

              {/* Status badge */}
              {!isPending && !isCompleted && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                    {task.status === 'IN_PROGRESS' ? t('tasks.status.inprogress') : t('tasks.status.cancelled')}
                  </span>
                </div>
              )}

              {/* Assigned user */}
              {task.assignedTo && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {t('tasks.assignedTo')}: {task.assignedTo.firstName} {task.assignedTo.lastName}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAddSubtask(task.id)}
                title={t('tasks.addSubtask')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Render subtasks recursively */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="space-y-2">
          {task.subtasks.map((subtask) => (
            <TaskCard
              key={subtask.id}
              task={subtask as Task}
              onToggleComplete={onToggleComplete}
              onAddSubtask={onAddSubtask}
              onEdit={onEdit}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
