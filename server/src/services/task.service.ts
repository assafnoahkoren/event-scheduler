import { prisma } from '../db'
import { z } from 'zod'
import { eventService } from './event.service'

// Zod schemas
export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional(),
  eventId: z.string().uuid(),
  parentTaskId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional(),
  parentTaskId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

class TaskService {
  async createTask(userId: string, data: CreateTaskInput) {
    // Verify event exists and user has access
    const event = await eventService.verifyEventAccess(userId, data.eventId)

    // If parentTaskId is provided, verify it exists and belongs to the same event
    if (data.parentTaskId) {
      const parentTask = await prisma.task.findFirst({
        where: {
          id: data.parentTaskId,
          eventId: data.eventId,
          isDeleted: false,
        },
      })

      if (!parentTask) {
        throw new Error('Parent task not found or does not belong to this event')
      }
    }

    // If assignedToId is provided, verify the user has access to the site
    if (data.assignedToId) {
      const hasAccess = await prisma.siteUser.findFirst({
        where: {
          userId: data.assignedToId,
          siteId: event.siteId,
          isDeleted: false,
        },
      })

      if (!hasAccess) {
        throw new Error('Assigned user does not have access to this site')
      }
    }

    return prisma.task.create({
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        createdById: userId,
      },
      include: {
        event: true,
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        parentTask: true,
        subtasks: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    })
  }

  async getTask(userId: string, taskId: string) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        isDeleted: false,
      },
      include: {
        event: true,
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        parentTask: true,
        subtasks: {
          where: { isDeleted: false },
          include: {
            assignedTo: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    })

    if (!task) {
      throw new Error('Task not found')
    }

    // Verify user has access to the event
    await eventService.verifyEventAccess(userId, task.eventId)

    return task
  }

  async listTasksForEvent(userId: string, eventId: string) {
    // Verify event exists and user has access
    await eventService.verifyEventAccess(userId, eventId)

    return prisma.task.findMany({
      where: {
        eventId,
        isDeleted: false,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        parentTask: true,
        subtasks: {
          where: { isDeleted: false },
          include: {
            assignedTo: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    })
  }

  async updateTask(userId: string, taskId: string, data: UpdateTaskInput) {
    // Verify task exists and user has access
    await this.getTask(userId, taskId)

    return prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        event: true,
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        parentTask: true,
        subtasks: {
          where: { isDeleted: false },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    })
  }

  async deleteTask(userId: string, taskId: string) {
    // Verify task exists and user has access
    await this.getTask(userId, taskId)

    // Soft delete the task (and its subtasks will be cascade soft deleted)
    await prisma.task.delete({
      where: { id: taskId },
    })

    return { success: true }
  }
}

export const taskService = new TaskService()
