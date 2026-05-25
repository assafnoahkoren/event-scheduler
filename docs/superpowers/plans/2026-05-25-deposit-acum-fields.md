# Deposit & ACUM Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `depositAmount` (optional number) and `acumPaid` (boolean) fields to events — editable in the event form and visualised as coloured $ / Music icons in the calendar cell.

**Architecture:** Two scalar fields on the `Event` Prisma model flow through the Zod `createEventSchema` (auto-picked up by `updateEventSchema`), the `EventForm` component, all mutation call sites, and the `CalendarCell` renderer. No new tables or relations.

**Tech Stack:** Prisma (PostgreSQL), tRPC, Zod, React, Tailwind CSS, lucide-react, i18next

---

### Task 1: Add fields to Prisma schema and migrate

**Files:**
- Modify: `server/prisma/schema/events/event.prisma`

- [ ] **Step 1: Add the two fields after `nickname`**

In `server/prisma/schema/events/event.prisma`, change:

```prisma
  nickname    String?

  // Client relationship (optional)
```

to:

```prisma
  nickname      String?
  depositAmount Float?   @map("deposit_amount")
  acumPaid      Boolean  @default(false) @map("acum_paid")

  // Client relationship (optional)
```

- [ ] **Step 2: Generate and run the migration**

```bash
cd server
npx prisma migrate dev --name add_deposit_acum_to_event
```

Expected: migration file created under `server/prisma/migrations/`, Prisma client regenerated. The generated SQL should contain:
```sql
ALTER TABLE "public"."events"
  ADD COLUMN "deposit_amount" DOUBLE PRECISION,
  ADD COLUMN "acum_paid" BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 3: Commit**

```bash
git add server/prisma/schema/events/event.prisma server/prisma/migrations/
git commit -m "feat: add depositAmount and acumPaid fields to Event model"
```

---

### Task 2: Add fields to Zod schema

**Files:**
- Modify: `server/src/services/event.service.ts`

- [ ] **Step 1: Add to `createEventSchema`**

In `server/src/services/event.service.ts`, change `createEventSchema`:

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

to:

```typescript
export const createEventSchema = z.object({
  siteId: z.string().uuid(),
  type: z.nativeEnum(EventType).default('EVENT'),
  title: z.string().optional(),
  description: z.string().optional(),
  nickname: z.string().optional(),
  depositAmount: z.number().optional(),
  acumPaid: z.boolean().optional(),
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
git commit -m "feat: add depositAmount and acumPaid to event Zod schema"
```

---

### Task 3: Add translation keys

**Files:**
- Modify: `webapp/src/locales/en/translation.ts`
- Modify: `webapp/src/locales/he/translation.ts`
- Modify: `webapp/src/locales/ar/translation.ts`

All three files are TypeScript. The `events` section in each contains keys like `eventNickname`.

- [ ] **Step 1: Add to English translations**

In `webapp/src/locales/en/translation.ts`, after `eventNickname: "Nickname",` add:

```typescript
    depositAmount: "Deposit",
    acumPaid: "ACUM Paid",
```

- [ ] **Step 2: Add to Hebrew translations**

In `webapp/src/locales/he/translation.ts`, after `eventNickname: "כינוי",` add:

```typescript
    depositAmount: "מקדמה",
    acumPaid: 'אקו"מ שולם',
```

- [ ] **Step 3: Add to Arabic translations**

In `webapp/src/locales/ar/translation.ts`, after `eventNickname: "لقب",` add:

```typescript
    depositAmount: "دفعة مقدمة",
    acumPaid: "رسوم أكوم مدفوعة",
```

- [ ] **Step 4: Commit**

```bash
git add webapp/src/locales/
git commit -m "feat: add depositAmount and acumPaid translation keys"
```

---

### Task 4: Add fields to `EventForm`

**Files:**
- Modify: `webapp/src/components/EventForm.tsx`

Context: `EventForm` uses `useState` for each field, passes them in `handleSubmit`, and has an auto-save debounce that also passes all fields. You must add the new fields to ALL three places: state, debounce callback, and `handleSubmit`. There is no `Checkbox` import yet — add it.

- [ ] **Step 1: Add `Checkbox` import**

At the top of `webapp/src/components/EventForm.tsx`, add `Checkbox` to the existing shadcn imports:

```typescript
import { Checkbox } from '@/components/ui/checkbox'
```

- [ ] **Step 2: Add `depositAmount` and `acumPaid` to `EventFormData`**

Change `EventFormData`:

```typescript
export interface EventFormData {
  type: 'EVENT' | 'PRE_EVENT_MEETING'
  title: string
  nickname?: string
  depositAmount?: number
  acumPaid?: boolean
  description?: string
  startDate: Date
  endDate?: Date
  isAllDay: boolean
  clientId?: string | null
  status?: 'DRAFT' | 'SCHEDULED' | 'CANCELLED'
}
```

- [ ] **Step 3: Add state**

After `const [nickname, setNickname] = useState(event?.nickname || '')`, add:

```typescript
  const [depositAmount, setDepositAmount] = useState<number | ''>(event?.depositAmount ?? '')
  const [acumPaid, setAcumPaid] = useState(event?.acumPaid ?? false)
```

- [ ] **Step 4: Add to the auto-save debounce callback**

In the `useEffect` debounce (the one with `onSubmitRef.current({ ... })`), add the two new fields to the object passed to `onSubmitRef.current`:

```typescript
      onSubmitRef.current({
        type,
        title: title.trim(),
        nickname: nickname.trim() || undefined,
        depositAmount: depositAmount !== '' ? depositAmount : undefined,
        acumPaid,
        description: description.trim() || undefined,
        startDate,
        endDate,
        isAllDay,
        clientId,
        status,
      })
```

Also add `depositAmount` and `acumPaid` to the dependency array of that `useEffect`:

```typescript
  }, [type, title, nickname, depositAmount, acumPaid, description, startDate, endDate, isAllDay, clientId, status]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 5: Add to `handleSubmit`**

```typescript
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    onSubmit({
      type,
      title: title.trim(),
      nickname: nickname.trim() || undefined,
      depositAmount: depositAmount !== '' ? depositAmount : undefined,
      acumPaid,
      description: description.trim() || undefined,
      startDate,
      endDate,
      isAllDay,
      clientId,
      status
    })
  }
```

- [ ] **Step 6: Render the Deposit input and ACUM checkbox**

After the `{/* Description */}` block (the `<Textarea>` block ending around line 335) and before the blank line before `{/* Actions */}`, add:

```tsx
      {/* Deposit & ACUM */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="depositAmount">{t('events.depositAmount')}</Label>
          <Input
            id="depositAmount"
            type="number"
            min="0"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acumPaid">{t('events.acumPaid')}</Label>
          <div className="flex items-center h-10">
            <Checkbox
              id="acumPaid"
              checked={acumPaid}
              onCheckedChange={(checked) => setAcumPaid(checked === true)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
```

- [ ] **Step 7: Run webapp type check**

```bash
cd webapp
npm run tsc
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add webapp/src/components/EventForm.tsx
git commit -m "feat: add depositAmount and acumPaid fields to EventForm"
```

---

### Task 5: Thread fields through mutation call sites

**Files:**
- Modify: `webapp/src/pages/Event.tsx` (around line 82)
- Modify: `webapp/src/components/EventCalendar.tsx` (around line 141)
- Modify: `webapp/src/components/WaitingListMatchNotification.tsx` (around line 196)

- [ ] **Step 1: Add to `handleUpdate` in `Event.tsx`**

Change `handleUpdate`:

```typescript
  const handleUpdate = (formData: EventFormData) => {
    if (!eventId) return

    updateMutation.mutate({
      id: eventId,
      type: formData.type,
      title: formData.title,
      nickname: formData.nickname || undefined,
      depositAmount: formData.depositAmount,
      acumPaid: formData.acumPaid,
      description: formData.description || undefined,
      startDate: formData.startDate.toISOString(),
      endDate: formData.endDate?.toISOString() || undefined,
      isAllDay: formData.isAllDay,
      clientId: formData.clientId || undefined,
      status: formData.status,
    })
  }
```

- [ ] **Step 2: Add to `handleCreateEvent` in `EventCalendar.tsx`**

Change the `createEventMutation.mutate` call:

```typescript
    createEventMutation.mutate({
      siteId: currentSite.id,
      type: formData.type,
      title: formData.title,
      nickname: formData.nickname || undefined,
      depositAmount: formData.depositAmount,
      acumPaid: formData.acumPaid,
      description: formData.description,
      startDate: formData.startDate.toISOString(),
      endDate: formData.endDate?.toISOString(),
      isAllDay: formData.isAllDay,
      clientId: formData.clientId || undefined,
      status: formData.status || 'SCHEDULED',
    })
```

- [ ] **Step 3: Add to `handleCreateEvent` in `WaitingListMatchNotification.tsx`**

Change the `createEventMutation.mutate` call:

```typescript
    createEventMutation.mutate({
      siteId: currentSite.id,
      title: formData.title,
      description: formData.description,
      startDate: formData.startDate.toISOString(),
      endDate: formData.endDate?.toISOString(),
      isAllDay: formData.isAllDay,
      clientId: formData.clientId || undefined,
      status: formData.status || 'SCHEDULED',
      nickname: formData.nickname || undefined,
      depositAmount: formData.depositAmount,
      acumPaid: formData.acumPaid,
      type: formData.type,
    })
```

- [ ] **Step 4: Run webapp type check**

```bash
cd webapp
npm run tsc
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/pages/Event.tsx webapp/src/components/EventCalendar.tsx webapp/src/components/WaitingListMatchNotification.tsx
git commit -m "feat: thread depositAmount and acumPaid through event mutation call sites"
```

---

### Task 6: Display icons in the calendar cell

**Files:**
- Modify: `webapp/src/components/EventCalendar.tsx`

Context: `CalendarCell` is defined around line 155. The top-start corner already has a `CalendarClock` icon using `absolute top-0.5`. The `DollarSign` and `Music` icons from lucide-react need to be imported (check the existing import — `CalendarClock` is already imported from `'lucide-react'`).

- [ ] **Step 1: Add `DollarSign` and `Music` to the lucide-react import**

In `webapp/src/components/EventCalendar.tsx`, change:

```typescript
import { CalendarClock } from 'lucide-react'
```

to:

```typescript
import { CalendarClock, DollarSign, Music } from 'lucide-react'
```

- [ ] **Step 2: Add the icon row inside `CalendarCell`**

In `CalendarCell`, after the closing `</div>` of the `flex-1` number area (after line ~220) and before the `<div className="h-5 ...">` nickname row, add:

```tsx
        {nonMeetingEvents.length === 1 && isCurrentMonth && (
          <div className="absolute top-0.5 start-0.5 flex gap-0.5 pointer-events-none">
            <DollarSign
              className={cn(
                "w-3 h-3",
                (nonMeetingEvents[0].depositAmount ?? 0) > 0
                  ? "text-green-500"
                  : "text-red-500"
              )}
            />
            <Music
              className={cn(
                "w-3 h-3",
                nonMeetingEvents[0].acumPaid
                  ? "text-green-500"
                  : "text-red-500"
              )}
            />
          </div>
        )}
```

Note: `nonMeetingEvents[0].depositAmount` can be `null` (DB nullable) or `undefined` — `?? 0` handles both.

- [ ] **Step 3: Run webapp type check**

```bash
cd webapp
npm run tsc
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/components/EventCalendar.tsx
git commit -m "feat: show deposit and ACUM status icons in calendar cell"
```
