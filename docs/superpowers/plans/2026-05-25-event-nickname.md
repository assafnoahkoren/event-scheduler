# Event Nickname Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `nickname` field to events — shown in the event form and under the day number in calendar cells that contain exactly one non-cancelled, non-meeting event.

**Architecture:** Add `nickname String?` to the Prisma model, add it to the Zod create schema (flows into update schema automatically), thread it through the form's data type and both mutation call sites, then render it in `CalendarCell`.

**Tech Stack:** Prisma (PostgreSQL), tRPC, Zod, React, Tailwind CSS, i18next

---

### Task 1: Add `nickname` to Prisma schema and migrate

**Files:**
- Modify: `server/prisma/schema/events/event.prisma`

- [ ] **Step 1: Add the field after `location`**

In `server/prisma/schema/events/event.prisma`, change:

```prisma
  // Event details
  type        EventType @default(EVENT)
  title       String?
  description String?
  location    String?
```

to:

```prisma
  // Event details
  type        EventType @default(EVENT)
  title       String?
  description String?
  location    String?
  nickname    String?
```

- [ ] **Step 2: Generate and run the migration**

```bash
cd server
npx prisma migrate dev --name add_event_nickname
```

Expected: migration created and applied, Prisma client regenerated.

- [ ] **Step 3: Verify Prisma client has the new field**

```bash
npx prisma generate
```

Expected: no errors, client types updated.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema/events/event.prisma server/prisma/migrations/
git commit -m "feat: add nickname field to Event model"
```

---

### Task 2: Add `nickname` to Zod schema

**Files:**
- Modify: `server/src/services/event.service.ts:8-19`

- [ ] **Step 1: Add `nickname` to `createEventSchema`**

In `server/src/services/event.service.ts`, change `createEventSchema`:

```typescript
export const createEventSchema = z.object({
  siteId: z.string().uuid(),
  type: z.nativeEnum(EventType).default('EVENT'),
  title: z.string().optional(),
  description: z.string().optional(),
  clientId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().default('UTC'),
  isAllDay: z.boolean().default(false),
  status: z.nativeEnum(EventStatus).default('DRAFT'),
})
```

to:

```typescript
export const createEventSchema = z.object({
  siteId: z.string().uuid(),
  type: z.nativeEnum(EventType).default('EVENT'),
  title: z.string().optional(),
  description: z.string().optional(),
  nickname: z.string().optional(),
  clientId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().default('UTC'),
  isAllDay: z.boolean().default(false),
  status: z.nativeEnum(EventStatus).default('DRAFT'),
})
```

`updateEventSchema` picks this up automatically via `.partial()`.

- [ ] **Step 2: Run server type check**

```bash
cd server
npm run tsc
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/event.service.ts
git commit -m "feat: add nickname to event Zod schema"
```

---

### Task 3: Add translation keys

**Files:**
- Modify: `webapp/src/locales/en/translation.ts`
- Modify: `webapp/src/locales/he/translation.ts`
- Modify: `webapp/src/locales/ar/translation.ts`

- [ ] **Step 1: Add to English translations**

In `webapp/src/locales/en/translation.ts`, after `eventTitle: "Event Title",` add:

```typescript
    eventNickname: "Nickname",
```

- [ ] **Step 2: Add to Hebrew translations**

In `webapp/src/locales/he/translation.ts`, after `eventTitle: "כותרת האירוע",` add:

```typescript
    eventNickname: "כינוי",
```

- [ ] **Step 3: Add to Arabic translations**

In `webapp/src/locales/ar/translation.ts`, after `eventTitle: "عنوان الحدث",` add:

```typescript
    eventNickname: "لقب",
```

- [ ] **Step 4: Commit**

```bash
git add webapp/src/locales/
git commit -m "feat: add eventNickname translation keys"
```

---

### Task 4: Add `nickname` to `EventFormData` and form UI

**Files:**
- Modify: `webapp/src/components/EventForm.tsx`

- [ ] **Step 1: Add `nickname` to `EventFormData`**

In `webapp/src/components/EventForm.tsx`, change `EventFormData`:

```typescript
export interface EventFormData {
  type: 'EVENT' | 'PRE_EVENT_MEETING'
  title: string
  description?: string
  startDate: Date
  endDate?: Date
  isAllDay: boolean
  clientId?: string | null
  status?: 'DRAFT' | 'SCHEDULED' | 'CANCELLED'
}
```

to:

```typescript
export interface EventFormData {
  type: 'EVENT' | 'PRE_EVENT_MEETING'
  title: string
  nickname?: string
  description?: string
  startDate: Date
  endDate?: Date
  isAllDay: boolean
  clientId?: string | null
  status?: 'DRAFT' | 'SCHEDULED' | 'CANCELLED'
}
```

- [ ] **Step 2: Add `nickname` state**

After `const [title, setTitle] = useState(event?.title || '')`, add:

```typescript
  const [nickname, setNickname] = useState(event?.nickname || '')
```

- [ ] **Step 3: Include `nickname` in `handleSubmit`**

Change `handleSubmit`:

```typescript
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    onSubmit({
      type,
      title: title.trim(),
      nickname: nickname.trim() || undefined,
      description: description.trim() || undefined,
      startDate,
      endDate,
      isAllDay,
      clientId,
      status
    })
  }
```

- [ ] **Step 4: Render the Nickname input after Title**

After the `{/* Title */}` block (lines 155-165) and before the `{/* Client */}` block, add:

```tsx
      {/* Nickname */}
      <div className="space-y-2">
        <Label htmlFor="nickname">{t('events.eventNickname')}</Label>
        <Input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t('events.eventNickname')}
          disabled={isSubmitting}
        />
      </div>
```

- [ ] **Step 5: Run webapp type check**

```bash
cd webapp
npm run tsc
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add webapp/src/components/EventForm.tsx
git commit -m "feat: add nickname field to EventForm"
```

---

### Task 5: Thread `nickname` through mutation call sites

**Files:**
- Modify: `webapp/src/pages/Event.tsx:82-96`
- Modify: `webapp/src/components/EventCalendar.tsx:141-151`

- [ ] **Step 1: Add `nickname` to `handleUpdate` in `Event.tsx`**

Change `handleUpdate`:

```typescript
  const handleUpdate = (formData: EventFormData) => {
    if (!eventId) return

    updateMutation.mutate({
      id: eventId,
      type: formData.type,
      title: formData.title,
      nickname: formData.nickname || undefined,
      description: formData.description || undefined,
      startDate: formData.startDate.toISOString(),
      endDate: formData.endDate?.toISOString() || undefined,
      isAllDay: formData.isAllDay,
      clientId: formData.clientId || undefined,
      status: formData.status,
    })
  }
```

- [ ] **Step 2: Add `nickname` to `createEventMutation.mutate` in `EventCalendar.tsx`**

In `EventCalendar.tsx`, change the `createEventMutation.mutate` call:

```typescript
    createEventMutation.mutate({
      siteId: currentSite.id,
      type: formData.type,
      title: formData.title,
      nickname: formData.nickname || undefined,
      description: formData.description,
      startDate: formData.startDate.toISOString(),
      endDate: formData.endDate?.toISOString(),
      isAllDay: formData.isAllDay,
      clientId: formData.clientId || undefined,
      status: formData.status || 'SCHEDULED',
    })
```

- [ ] **Step 3: Run webapp type check**

```bash
cd webapp
npm run tsc
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/pages/Event.tsx webapp/src/components/EventCalendar.tsx
git commit -m "feat: thread nickname through event mutation call sites"
```

---

### Task 6: Display nickname in the calendar cell

**Files:**
- Modify: `webapp/src/components/EventCalendar.tsx` — `CalendarCell` component (lines 198-229)

- [ ] **Step 1: Add nickname display below the day number span**

In `CalendarCell`, after the closing `</span>` of the day number (after line 219), add the nickname display before the `{hasPreEventMeeting && ...}` block:

```tsx
        {nonMeetingEvents.length === 1 && nonMeetingEvents[0].nickname && isCurrentMonth && (
          <span className="absolute bottom-0.5 start-0 end-0 text-center text-xs text-gray-500 leading-none pointer-events-none truncate px-0.5">
            {nonMeetingEvents[0].nickname}
          </span>
        )}
```

Note:
- Uses `bottom-0.5` (same slot as the event-count badge — the two are mutually exclusive since the count only shows when `eventCount > 1` and nickname only shows when `nonMeetingEvents.length === 1`).
- Uses `start-0 end-0` (RTL-safe logical properties) instead of `left-0 right-0`.
- `truncate` prevents long nicknames from breaking the cell layout.

- [ ] **Step 2: Run webapp type check**

```bash
cd webapp
npm run tsc
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/components/EventCalendar.tsx
git commit -m "feat: show event nickname in calendar cell when single event on day"
```
