import { z } from 'zod'
import { prisma } from '../../db'
import { WaitingListRuleType, WaitingListStatus } from '@prisma/client'

// Zod schemas for validation
export const createWaitingListEntrySchema = z.object({
  siteId: z.string().uuid(),
  clientId: z.string().uuid(),
  ruleType: z.enum(['SPECIFIC_DATES', 'DAY_OF_WEEK', 'DATE_RANGE']),
  specificDates: z.array(z.string()).optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  expirationDate: z.string().datetime(),
  notes: z.string().optional(),
  createdBy: z.string().uuid()
})

export const updateWaitingListEntrySchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['PENDING', 'FULFILLED', 'EXPIRED', 'CANCELLED']).optional(),
  eventId: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
  expirationDate: z.string().datetime().optional(),
  fulfilledAt: z.string().datetime().optional().nullable()
})

export const listWaitingListEntriesSchema = z.object({
  siteId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'FULFILLED', 'EXPIRED', 'CANCELLED']).optional(),
  includeExpired: z.boolean().optional().default(false)
})

// Types
export type CreateWaitingListEntryInput = z.infer<typeof createWaitingListEntrySchema>
export type UpdateWaitingListEntryInput = z.infer<typeof updateWaitingListEntrySchema>
export type ListWaitingListEntriesInput = z.infer<typeof listWaitingListEntriesSchema>

// Service functions
export async function createWaitingListEntry(input: CreateWaitingListEntryInput) {
  const validated = createWaitingListEntrySchema.parse(input)

  // Validate that the appropriate field is provided based on ruleType
  if (validated.ruleType === 'SPECIFIC_DATES' && !validated.specificDates) {
    throw new Error('specificDates is required for SPECIFIC_DATES rule type')
  }
  if (validated.ruleType === 'DAY_OF_WEEK' && !validated.daysOfWeek) {
    throw new Error('daysOfWeek is required for DAY_OF_WEEK rule type')
  }
  if (validated.ruleType === 'DATE_RANGE' && !validated.dateRange) {
    throw new Error('dateRange is required for DATE_RANGE rule type')
  }

  return prisma.waitingListEntry.create({
    data: {
      siteId: validated.siteId,
      clientId: validated.clientId,
      ruleType: validated.ruleType as WaitingListRuleType,
      specificDates: validated.specificDates || undefined,
      daysOfWeek: validated.daysOfWeek || undefined,
      dateRange: validated.dateRange || undefined,
      expirationDate: new Date(validated.expirationDate),
      notes: validated.notes,
      createdBy: validated.createdBy,
      status: 'PENDING'
    },
    include: {
      client: true,
      creator: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      },
      event: true
    }
  })
}

export async function updateWaitingListEntry(input: UpdateWaitingListEntryInput) {
  const validated = updateWaitingListEntrySchema.parse(input)

  // Check if the entry exists
  const existing = await prisma.waitingListEntry.findUnique({
    where: { id: validated.id }
  })

  if (!existing) {
    throw new Error('Waiting list entry not found')
  }

  const updateData: any = {}

  if (validated.status !== undefined) {
    updateData.status = validated.status as WaitingListStatus
  }

  if (validated.eventId !== undefined) {
    updateData.eventId = validated.eventId
  }

  if (validated.notes !== undefined) {
    updateData.notes = validated.notes
  }

  if (validated.expirationDate !== undefined) {
    updateData.expirationDate = new Date(validated.expirationDate)
  }

  if (validated.fulfilledAt !== undefined) {
    updateData.fulfilledAt = validated.fulfilledAt ? new Date(validated.fulfilledAt) : null
  }

  return prisma.waitingListEntry.update({
    where: { id: validated.id },
    data: updateData,
    include: {
      client: true,
      creator: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      },
      event: true
    }
  })
}

export async function listWaitingListEntries(input: ListWaitingListEntriesInput) {
  const validated = listWaitingListEntriesSchema.parse(input)

  const where: any = {
    siteId: validated.siteId
  }

  if (validated.clientId) {
    where.clientId = validated.clientId
  }

  if (validated.status) {
    where.status = validated.status as WaitingListStatus
  }

  // Optionally exclude expired entries
  if (!validated.includeExpired) {
    where.OR = [
      { status: { not: 'EXPIRED' } },
      { expirationDate: { gt: new Date() } }
    ]
  }

  return prisma.waitingListEntry.findMany({
    where,
    include: {
      client: true,
      creator: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      },
      event: true
    },
    orderBy: [
      { status: 'asc' }, // PENDING first
      { createdAt: 'asc' } // Oldest first (first come, first served)
    ]
  })
}

export async function getWaitingListEntry(id: string) {
  const entry = await prisma.waitingListEntry.findUnique({
    where: { id },
    include: {
      client: true,
      creator: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      },
      event: true,
      site: true
    }
  })

  if (!entry) {
    throw new Error('Waiting list entry not found')
  }

  return entry
}

export async function deleteWaitingListEntry(id: string) {
  // Soft delete is handled by the Prisma extension
  return prisma.waitingListEntry.delete({
    where: { id }
  })
}

// Helper function to check for matching available dates
export async function checkForMatches(siteId: string, date: Date) {
  const dayOfWeek = date.getDay()
  const dateString = date.toISOString().split('T')[0]

  // Find all pending entries that might match this date
  const entries = await prisma.waitingListEntry.findMany({
    where: {
      siteId,
      status: 'PENDING',
      expirationDate: { gte: date },
      OR: [
        // Check for specific dates match
        {
          ruleType: 'SPECIFIC_DATES',
          // This would need a raw query or post-processing to check JSON array
        },
        // Check for day of week match
        {
          ruleType: 'DAY_OF_WEEK',
          // This would need a raw query or post-processing to check JSON array
        },
        // Check for date range match
        {
          ruleType: 'DATE_RANGE',
          // This would need a raw query or post-processing to check JSON object
        }
      ]
    },
    include: {
      client: true,
      creator: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc' // First come, first served
    }
  })

  // Post-process to check JSON fields
  const matches = entries.filter(entry => {
    if (entry.ruleType === 'SPECIFIC_DATES' && entry.specificDates) {
      const dates = entry.specificDates as string[]
      return dates.includes(dateString)
    }

    if (entry.ruleType === 'DAY_OF_WEEK' && entry.daysOfWeek) {
      const days = entry.daysOfWeek as number[]
      return days.includes(dayOfWeek)
    }

    if (entry.ruleType === 'DATE_RANGE' && entry.dateRange) {
      const range = entry.dateRange as { start: string; end: string }
      return dateString >= range.start && dateString <= range.end
    }

    return false
  })

  return matches
}

// Helper function to automatically expire old entries
export async function expireOldEntries(siteId: string) {
  const now = new Date()

  return prisma.waitingListEntry.updateMany({
    where: {
      siteId,
      status: 'PENDING',
      expirationDate: { lt: now }
    },
    data: {
      status: 'EXPIRED'
    }
  })
}

// Check all waiting list entries for a site and find potential matches
export async function checkAllEntriesForMatches(
  siteId: string,
  startDate?: Date,
  endDate?: Date
) {
  // Default date range: today to 30 days from now
  const start = startDate || new Date()
  let end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // Limit date range to maximum 90 days to prevent DDoS
  const MAX_DAYS_RANGE = 90
  const maxEndDate = new Date(start.getTime() + MAX_DAYS_RANGE * 24 * 60 * 60 * 1000)
  if (end > maxEndDate) {
    end = maxEndDate
  }

  // First, expire old entries
  await expireOldEntries(siteId)

  // Get all pending entries for the site
  const entries = await prisma.waitingListEntry.findMany({
    where: {
      siteId,
      status: 'PENDING',
      expirationDate: { gte: start }
    },
    include: {
      client: true,
      creator: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc' // First come, first served
    }
  })

  // Get existing events in the date range to check availability
  const existingEvents = await prisma.event.findMany({
    where: {
      siteId,
      startDate: {
        gte: start,
        lte: end
      },
      status: { not: 'CANCELLED' }
    },
    select: {
      startDate: true,
      endDate: true,
      clientId: true
    }
  })

  // Create a map of occupied dates
  const occupiedDates = new Set<string>()
  existingEvents.forEach(event => {
    const eventDate = new Date(event.startDate)
    occupiedDates.add(eventDate.toISOString().split('T')[0])
  })

  // Check each entry for matches
  const results: Array<{
    entry: typeof entries[0],
    matchingDates: Date[],
    earliestMatch: Date,
    matchCount: number
  }> = []

  for (const entry of entries) {
    const matchingDates: Date[] = []

    // Generate dates to check based on rule type
    if (entry.ruleType === 'SPECIFIC_DATES' && entry.specificDates) {
      const dates = entry.specificDates as string[]

      for (const dateStr of dates) {
        const date = new Date(dateStr)
        if (date >= start && date <= end && date >= entry.expirationDate) {
          continue // Skip if past expiration
        }
        if (!occupiedDates.has(dateStr)) {
          matchingDates.push(date)
        }
      }
    }

    else if (entry.ruleType === 'DAY_OF_WEEK' && entry.daysOfWeek) {
      const days = entry.daysOfWeek as number[]
      const current = new Date(start)

      while (current <= end && current <= entry.expirationDate) {
        if (days.includes(current.getDay())) {
          const dateStr = current.toISOString().split('T')[0]
          if (!occupiedDates.has(dateStr)) {
            matchingDates.push(new Date(current))
          }
        }
        current.setDate(current.getDate() + 1)
      }
    }

    else if (entry.ruleType === 'DATE_RANGE' && entry.dateRange) {
      const range = entry.dateRange as { start: string; end: string }
      const rangeStart = new Date(range.start)
      const rangeEnd = new Date(range.end)
      const current = new Date(Math.max(rangeStart.getTime(), start.getTime()))
      const finalEnd = new Date(Math.min(rangeEnd.getTime(), end.getTime(), entry.expirationDate.getTime()))

      while (current <= finalEnd) {
        const dateStr = current.toISOString().split('T')[0]
        if (!occupiedDates.has(dateStr)) {
          matchingDates.push(new Date(current))
        }
        current.setDate(current.getDate() + 1)
      }
    }

    if (matchingDates.length > 0) {
      results.push({
        entry,
        matchingDates: matchingDates.sort((a, b) => a.getTime() - b.getTime()),
        earliestMatch: matchingDates[0],
        matchCount: matchingDates.length
      })
    }
  }

  // Sort by creation date (first come, first served)
  results.sort((a, b) =>
    new Date(a.entry.createdAt).getTime() - new Date(b.entry.createdAt).getTime()
  )

  // Group by date to see conflicts
  const dateConflicts = new Map<string, typeof results>()

  for (const result of results) {
    for (const date of result.matchingDates) {
      const dateStr = date.toISOString().split('T')[0]
      if (!dateConflicts.has(dateStr)) {
        dateConflicts.set(dateStr, [])
      }
      dateConflicts.get(dateStr)!.push(result)
    }
  }

  // Find dates with multiple requests
  const conflictingDates = Array.from(dateConflicts.entries())
    .filter(([_, entries]) => entries.length > 1)
    .map(([date, entries]) => ({
      date,
      entries: entries.map(e => ({
        entry: e.entry,
        priority: entries.indexOf(e) + 1 // Priority based on creation date
      }))
    }))

  return {
    matches: results,
    conflictingDates,
    summary: {
      totalPendingEntries: entries.length,
      entriesWithMatches: results.length,
      totalAvailableDates: results.reduce((sum, r) => sum + r.matchCount, 0),
      datesWithConflicts: conflictingDates.length
    }
  }
}