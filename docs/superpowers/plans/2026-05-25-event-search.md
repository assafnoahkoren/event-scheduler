# Event Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a debounced search bar above `EventCalendar` on the Home page that searches all site events by title, description, client name, and dd/mm date, showing results in a fixed overlay sorted future-first.

**Architecture:** A new `events.search` tRPC procedure handles backend full-text search using Prisma OR filters and dd/mm date parsing for last/current/next year. A new `EventSearchBar` React component handles the input, debouncing (300ms), overlay rendering, and click-outside detection. The component mounts in `Home.tsx` above `<EventCalendar />`.

**Tech Stack:** tRPC, Prisma (PostgreSQL), React, Tailwind CSS, `useDebounce` hook (existing at `webapp/src/hooks/useDebounce.ts`), `EventCard` component (existing), lucide-react

---

### Task 1: Add searchEventsSchema and searchEvents to event service

**Files:**
- Modify: `server/src/services/event.service.ts`

- [ ] **Step 1: Add schema and type export after `getEventsSchema`**

In `server/src/services/event.service.ts`, after the `getEventsSchema` block (around line 31), add:

```typescript
export const searchEventsSchema = z.object({
  siteId: z.string().uuid(),
  query: z.string().min(1),
})

export type SearchEventsInput = z.infer<typeof searchEventsSchema>
```

- [ ] **Step 2: Add `parseDdMm` private method inside EventService class**

Inside the `EventService` class, add this private method before `createEvent`:

```typescript
private parseDdMm(query: string): { day: number; month: number } | null {
  const match = query.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!match) return null
  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  return { day, month }
}
```

- [ ] **Step 3: Add `searchEvents` method inside EventService class**

Inside the `EventService` class, add this method after `deleteEvent` and before the closing `}` of the class:

```typescript
async searchEvents(userId: string, input: SearchEventsInput) {
  const siteUser = await prisma.siteUser.findFirst({
    where: { userId, siteId: input.siteId }
  })

  if (!siteUser) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to view events in this site'
    })
  }

  const orClauses: any[] = [
    { title: { contains: input.query, mode: 'insensitive' } },
    { description: { contains: input.query, mode: 'insensitive' } },
    { client: { name: { contains: input.query, mode: 'insensitive' } } },
  ]

  const parsed = this.parseDdMm(input.query)
  if (parsed) {
    const currentYear = new Date().getFullYear()
    for (const year of [currentYear - 1, currentYear, currentYear + 1]) {
      const start = new Date(year, parsed.month - 1, parsed.day, 0, 0, 0, 0)
      const end = new Date(year, parsed.month - 1, parsed.day, 23, 59, 59, 999)
      orClauses.push({ startDate: { gte: start, lte: end } })
    }
  }

  const events = await prisma.event.findMany({
    where: { siteId: input.siteId, OR: orClauses },
    include: {
      client: true,
      creator: { select: { id: true, firstName: true, lastName: true } }
    }
  })

  const now = new Date()
  const future = events
    .filter(e => e.startDate >= now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  const past = events
    .filter(e => e.startDate < now)
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())

  return [...future, ...past]
}
```

- [ ] **Step 4: Run server type check**

```bash
cd server && npm run tsc
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/event.service.ts
git commit -m "feat: add searchEvents service method with dd/mm date support"
```

---

### Task 2: Add events.search tRPC procedure

**Files:**
- Modify: `server/src/routers/event.router.ts`

- [ ] **Step 1: Update import from event service**

In `server/src/routers/event.router.ts`, update the import block to include `searchEventsSchema`:

```typescript
import {
  eventService,
  createEventSchema,
  updateEventSchema,
  getEventsSchema,
  searchEventsSchema
} from '../services/event.service'
```

- [ ] **Step 2: Add search procedure to event router**

Inside the `router({...})` object in `server/src/routers/event.router.ts`, after the `profitByDateRange` procedure, add:

```typescript
search: protectedProcedure
  .input(searchEventsSchema)
  .query(async ({ ctx, input }) => {
    return eventService.searchEvents(ctx.user.id, input)
  }),
```

- [ ] **Step 3: Run server type check**

```bash
cd server && npm run tsc
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/routers/event.router.ts
git commit -m "feat: expose events.search tRPC procedure"
```

---

### Task 3: Add translation keys

**Files:**
- Modify: `webapp/src/locales/en/translation.ts`
- Modify: `webapp/src/locales/ar/translation.ts`
- Modify: `webapp/src/locales/he/translation.ts`

- [ ] **Step 1: Add keys to English translation**

In `webapp/src/locales/en/translation.ts`, inside the `events` object (after `noEvents: "No events scheduled yet"`), add:

```typescript
searchPlaceholder: "Search events...",
searchNoResults: "No events found",
```

- [ ] **Step 2: Add keys to Arabic translation**

In `webapp/src/locales/ar/translation.ts`, inside the `events` object (after `noEvents`), add:

```typescript
searchPlaceholder: "البحث عن أحداث...",
searchNoResults: "لم يتم العثور على أحداث",
```

- [ ] **Step 3: Add keys to Hebrew translation**

In `webapp/src/locales/he/translation.ts`, inside the `events` object (after `noEvents`), add:

```typescript
searchPlaceholder: "חפש אירועים...",
searchNoResults: "לא נמצאו אירועים",
```

- [ ] **Step 4: Run webapp type check to verify translation types are satisfied**

```bash
cd webapp && npm run tsc
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/locales/en/translation.ts webapp/src/locales/ar/translation.ts webapp/src/locales/he/translation.ts
git commit -m "feat: add event search translation keys"
```

---

### Task 4: Create EventSearchBar component

**Files:**
- Create: `webapp/src/components/EventSearchBar.tsx`

- [ ] **Step 1: Create the component**

Create `webapp/src/components/EventSearchBar.tsx` with:

```typescript
import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { EventCard } from '@/components/EventCard'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { useDebounce } from '@/hooks/useDebounce'
import { useTranslation } from 'react-i18next'

export function EventSearchBar() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [overlayTop, setOverlayTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  const showOverlay = isFocused && query.length >= 2

  const { data: results = [], isLoading } = trpc.events.search.useQuery(
    { siteId: currentSite!.id, query: debouncedQuery },
    { enabled: showOverlay && debouncedQuery.length >= 2 }
  )

  useEffect(() => {
    if (showOverlay && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setOverlayTop(rect.bottom)
    }
  }, [showOverlay])

  useEffect(() => {
    if (!isFocused) return
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isFocused])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsFocused(false)
      setQuery('')
    }
  }

  const handleResultClick = () => {
    setIsFocused(false)
    setQuery('')
  }

  if (!currentSite) return null

  return (
    <div ref={containerRef} className="relative px-4 pt-3 pb-1">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="ps-9"
          placeholder={t('events.searchPlaceholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {showOverlay && (
        <div
          className="fixed inset-x-0 bottom-0 bg-white z-50 overflow-y-auto shadow-lg border-t"
          style={{ top: overlayTop }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              {t('events.searchNoResults')}
            </div>
          ) : (
            <div className="divide-y">
              {results.map(event => (
                <div key={event.id} onClick={handleResultClick}>
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run webapp type check**

```bash
cd webapp && npm run tsc
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/components/EventSearchBar.tsx
git commit -m "feat: add EventSearchBar component with debounced search and fixed overlay"
```

---

### Task 5: Mount EventSearchBar in Home.tsx

**Files:**
- Modify: `webapp/src/pages/home/Home.tsx`

- [ ] **Step 1: Add import**

In `webapp/src/pages/home/Home.tsx`, add after the existing imports:

```typescript
import { EventSearchBar } from '@/components/EventSearchBar'
```

- [ ] **Step 2: Place EventSearchBar above EventCalendar**

In `webapp/src/pages/home/Home.tsx`, replace:

```tsx
<WaitingListMatchNotification />
<EventCalendar />
```

with:

```tsx
<WaitingListMatchNotification />
<EventSearchBar />
<EventCalendar />
```

- [ ] **Step 3: Run webapp type check**

```bash
cd webapp && npm run tsc
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/pages/home/Home.tsx
git commit -m "feat: mount EventSearchBar above EventCalendar on home page"
```
