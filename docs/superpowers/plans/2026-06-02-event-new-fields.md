# Event Model New Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add catering, startTime, endTime, guestCountAdults, and guestCountChildren fields to the Event model — from DB schema through tRPC to the EventForm UI.

**Architecture:** Add five nullable columns to the Prisma Event model, extend the existing Zod schemas in `event.service.ts`, add a `getCateringOptions` query to the event service + router, create two reusable UI components (`TimeInput`, `CateringInput`), and update `EventForm.tsx` to render and auto-save the new fields.

**Tech Stack:** Prisma (PostgreSQL), tRPC, Zod, React, shadcn/ui, TypeScript

---

## File Map

| Action | File |
|--------|------|
| Modify | `server/prisma/schema/events/event.prisma` |
| Modify | `server/src/services/event.service.ts` |
| Modify | `server/src/routers/event.router.ts` |
| Create | `webapp/src/components/ui/TimeInput.tsx` |
| Create | `webapp/src/components/CateringInput.tsx` |
| Modify | `webapp/src/components/EventForm.tsx` |

---

### Task 1: Prisma Schema + Migration

**Files:**
- Modify: `server/prisma/schema/events/event.prisma`

- [ ] **Step 1: Add 5 new fields to the Event model**

  Open `server/prisma/schema/events/event.prisma`. Find the `acumPaid` field (after the financial fields section) and add the new fields immediately after it:

  ```prisma
  acumPaid      Boolean  @default(false) @map("acum_paid")

  // Catering and logistics
  catering           String?  @map("catering")
  startTime          String?  @map("start_time")
  endTime            String?  @map("end_time")
  guestCountAdults   Int?     @map("guest_count_adults")
  guestCountChildren Int?     @map("guest_count_children")
  ```

- [ ] **Step 2: Run migration**

  ```bash
  cd server
  npx prisma migrate dev --name add_event_catering_times_guests
  ```

  Expected output:
  ```
  The following migration(s) have been created and applied from new schema changes:

  migrations/
    └─ XXXXXXXXXXXXXX_add_event_catering_times_guests/
      └─ migration.sql

  Your database is now in sync with your schema.
  ```

- [ ] **Step 3: Verify generated client includes new fields**

  ```bash
  cd server
  npx prisma generate
  ```

  Expected: No errors.

- [ ] **Step 4: Commit**

  ```bash
  git add server/prisma/schema/events/event.prisma server/prisma/migrations
  git commit -m "feat: add catering, times, guest count fields to Event schema"
  ```

---

### Task 2: Zod Schemas + getCateringOptions Service Method

**Files:**
- Modify: `server/src/services/event.service.ts`

- [ ] **Step 1: Add 5 new fields to `createEventSchema`**

  In `server/src/services/event.service.ts`, find `createEventSchema` (line 8). Add the new fields before the closing `})`:

  ```typescript
  export const createEventSchema = z.object({
    siteId: z.string().uuid(),
    type: z.nativeEnum(EventType).default('EVENT'),
    title: z.string().optional(),
    description: z.string().optional(),
    nickname: z.string().optional(),
    depositAmount: z.number().nullable().optional(),
    acumPaid: z.boolean().optional(),
    clientId: z.string().uuid().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    timezone: z.string().default('UTC'),
    isAllDay: z.boolean().default(false),
    status: z.nativeEnum(EventStatus).default('DRAFT'),
    catering: z.string().optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    guestCountAdults: z.number().int().min(0).optional(),
    guestCountChildren: z.number().int().min(0).optional(),
  })
  ```

  `updateEventSchema` (line 24) uses `.partial()` on `createEventSchema`, so it inherits the new fields automatically — no change needed there.

- [ ] **Step 2: Add `getCateringOptions` method to `EventService` class**

  In the `EventService` class, add this method after the existing methods:

  ```typescript
  async getCateringOptions(userId: string, siteId: string): Promise<string[]> {
    const siteUser = await prisma.siteUser.findFirst({
      where: { userId, siteId },
    })
    if (!siteUser) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
    }

    const results = await prisma.event.findMany({
      where: {
        siteId,
        catering: { not: null },
        isDeleted: false,
      },
      select: { catering: true },
      distinct: ['catering'],
    })

    return results
      .map(r => r.catering)
      .filter((c): c is string => c !== null && c !== '')
  }
  ```

- [ ] **Step 3: Run type check**

  ```bash
  cd server
  npm run tsc
  ```

  Expected: No errors.

- [ ] **Step 4: Commit**

  ```bash
  git add server/src/services/event.service.ts
  git commit -m "feat: extend event Zod schemas and add getCateringOptions service method"
  ```

---

### Task 3: Add `getCateringOptions` to the Event Router

**Files:**
- Modify: `server/src/routers/event.router.ts`

- [ ] **Step 1: Add the new procedure to the router**

  In `server/src/routers/event.router.ts`, add `getCateringOptions` after the `search` procedure (before the closing `})`):

  ```typescript
  getCateringOptions: protectedProcedure
    .input(z.object({ siteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return eventService.getCateringOptions(ctx.user.id, input.siteId)
    }),
  ```

- [ ] **Step 2: Run type check**

  ```bash
  cd server
  npm run tsc
  ```

  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add server/src/routers/event.router.ts
  git commit -m "feat: expose getCateringOptions tRPC procedure"
  ```

---

### Task 4: Create `TimeInput` Component

**Files:**
- Create: `webapp/src/components/ui/TimeInput.tsx`

- [ ] **Step 1: Create the component**

  ```tsx
  import { Input } from './input'
  import { Label } from './label'

  interface TimeInputProps {
    label: string
    value: string | undefined
    onChange: (val: string | undefined) => void
    hint?: string
  }

  export function TimeInput({ label, value, onChange, hint }: TimeInputProps) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Input
          type="time"
          value={value ?? ''}
          onChange={e => onChange(e.target.value || undefined)}
        />
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    )
  }
  ```

- [ ] **Step 2: Run type check**

  ```bash
  cd webapp
  npm run tsc
  ```

  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add webapp/src/components/ui/TimeInput.tsx
  git commit -m "feat: add TimeInput component"
  ```

---

### Task 5: Create `CateringInput` Component

**Files:**
- Create: `webapp/src/components/CateringInput.tsx`

- [ ] **Step 1: Create the component**

  ```tsx
  import { useState } from 'react'
  import { Input } from '@/components/ui/input'
  import { Label } from '@/components/ui/label'

  interface CateringInputProps {
    label: string
    value: string | undefined
    onChange: (val: string | undefined) => void
    options: string[]
  }

  export function CateringInput({ label, value, onChange, options }: CateringInputProps) {
    const [open, setOpen] = useState(false)

    const filtered = options.filter(opt =>
      value ? opt.toLowerCase().includes(value.toLowerCase()) : true
    )

    return (
      <div className="relative space-y-2">
        <Label>{label}</Label>
        <Input
          value={value ?? ''}
          onChange={e => onChange(e.target.value || undefined)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="הזן שם קייטרינג"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-10 w-full bg-background border rounded-md shadow-md mt-1 max-h-40 overflow-y-auto">
            {filtered.map(opt => (
              <button
                key={opt}
                type="button"
                className="w-full px-3 py-2 text-right text-sm hover:bg-accent"
                onMouseDown={() => {
                  onChange(opt)
                  setOpen(false)
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Run type check**

  ```bash
  cd webapp
  npm run tsc
  ```

  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add webapp/src/components/CateringInput.tsx
  git commit -m "feat: add CateringInput component with autocomplete"
  ```

---

### Task 6: Update EventForm

**Files:**
- Modify: `webapp/src/components/EventForm.tsx`

- [ ] **Step 1: Add imports at top of file**

  After the existing imports (after line 20), add:

  ```typescript
  import { TimeInput } from '@/components/ui/TimeInput'
  import { CateringInput } from '@/components/CateringInput'
  ```

- [ ] **Step 2: Add `siteId` prop to `EventFormProps`**

  Update the `EventFormProps` interface (lines 27–35) to add `siteId`:

  ```typescript
  interface EventFormProps {
    siteId?: string
    event?: Event | null
    initialDate?: Date
    initialClientId?: string | null
    onSubmit: (data: EventFormData) => void
    onCancel?: () => void
    isSubmitting?: boolean
    saveError?: boolean
  }
  ```

- [ ] **Step 3: Extend `EventFormData` with the 5 new fields**

  Update the `EventFormData` interface (lines 37–49) to add:

  ```typescript
  export interface EventFormData {
    type: 'EVENT' | 'PRE_EVENT_MEETING'
    title: string
    nickname?: string
    depositAmount?: number | null
    acumPaid?: boolean
    description?: string
    startDate: Date
    endDate?: Date
    isAllDay: boolean
    clientId?: string | null
    status?: 'DRAFT' | 'SCHEDULED' | 'CANCELLED'
    catering?: string
    startTime?: string
    endTime?: string
    guestCountAdults?: number | null
    guestCountChildren?: number | null
  }
  ```

- [ ] **Step 4: Destructure `siteId` in the component function and add 5 new state variables**

  Update the function signature (line 51) to destructure `siteId`:

  ```typescript
  export function EventForm({
    siteId,
    event,
    initialDate,
    initialClientId,
    onSubmit,
    onCancel,
    isSubmitting = false,
    saveError = false
  }: EventFormProps) {
  ```

  After the `status` state (line 81), add:

  ```typescript
  const [catering, setCatering] = useState<string | undefined>(event?.catering ?? undefined)
  const [startTime, setStartTime] = useState<string | undefined>(event?.startTime ?? undefined)
  const [endTime, setEndTime] = useState<string | undefined>(event?.endTime ?? undefined)
  const [guestCountAdults, setGuestCountAdults] = useState<number | ''>(event?.guestCountAdults ?? '')
  const [guestCountChildren, setGuestCountChildren] = useState<number | ''>(event?.guestCountChildren ?? '')
  ```

- [ ] **Step 5: Add the catering options query**

  After the `updateClientMutation` block (after line 179), add:

  ```typescript
  const effectiveSiteId = siteId ?? event?.siteId
  const { data: cateringOptions = [] } = trpc.events.getCateringOptions.useQuery(
    { siteId: effectiveSiteId! },
    { enabled: !!effectiveSiteId }
  )
  ```

- [ ] **Step 6: Add new fields to the auto-save payload**

  In the debounced auto-save callback (lines 140–152), add the new fields:

  ```typescript
  onSubmitRef.current({
    type,
    title: title.trim(),
    nickname: nickname.trim() || undefined,
    depositAmount: depositAmount !== '' ? depositAmount : null,
    acumPaid,
    description: description.trim() || undefined,
    startDate,
    endDate,
    isAllDay,
    clientId,
    status,
    catering: catering || undefined,
    startTime,
    endTime,
    guestCountAdults: guestCountAdults !== '' ? guestCountAdults : null,
    guestCountChildren: guestCountChildren !== '' ? guestCountChildren : null,
  })
  ```

- [ ] **Step 7: Add new fields to the auto-save dependency array**

  Update the dependency array (line 161) to include the new state variables:

  ```typescript
  }, [type, title, nickname, depositAmount, acumPaid, description, startDate, endDate, isAllDay, clientId, status, catering, startTime, endTime, guestCountAdults, guestCountChildren]) // eslint-disable-line react-hooks/exhaustive-deps
  ```

- [ ] **Step 8: Add new fields to `handleSubmit`**

  Update `handleSubmit` (lines 193–205) to include the new fields:

  ```typescript
  onSubmit({
    type,
    title: title.trim(),
    nickname: nickname.trim() || undefined,
    depositAmount: depositAmount !== '' ? depositAmount : null,
    acumPaid,
    description: description.trim() || undefined,
    startDate,
    endDate,
    isAllDay,
    clientId,
    status,
    catering: catering || undefined,
    startTime,
    endTime,
    guestCountAdults: guestCountAdults !== '' ? guestCountAdults : null,
    guestCountChildren: guestCountChildren !== '' ? guestCountChildren : null,
  })
  ```

- [ ] **Step 9: Add the new UI section**

  Add the following JSX block inside the `<form>` element, after the Deposit & ACUM grid (after the closing `</div>` of that section, before the Actions section — around line 353):

  ```tsx
  {/* Catering, Times, Guest Counts */}
  <div className="space-y-4">
    {/* Catering */}
    <CateringInput
      label="קייטרינג"
      value={catering}
      onChange={setCatering}
      options={cateringOptions}
    />

    {/* Start & End Time */}
    <div className="grid grid-cols-2 gap-4">
      <TimeInput
        label="שעת התחלה"
        value={startTime}
        onChange={setStartTime}
      />
      <TimeInput
        label="שעת סיום"
        value={endTime}
        onChange={setEndTime}
        hint="לאחר חצות = יום למחרת"
      />
    </div>

    {/* Guest Counts */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="guestCountAdults">מבוגרים</Label>
        <Input
          id="guestCountAdults"
          type="number"
          min="0"
          value={guestCountAdults}
          onChange={e => setGuestCountAdults(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="guestCountChildren">ילדים</Label>
        <Input
          id="guestCountChildren"
          type="number"
          min="0"
          value={guestCountChildren}
          onChange={e => setGuestCountChildren(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0"
        />
      </div>
    </div>
  </div>
  ```

- [ ] **Step 10: Run type check**

  ```bash
  cd webapp
  npm run tsc
  ```

  Expected: No errors.

- [ ] **Step 11: Commit**

  ```bash
  git add webapp/src/components/EventForm.tsx
  git commit -m "feat: add catering, times, and guest count fields to EventForm"
  ```

---

### Task 7: Verify in Browser

- [ ] **Step 1: Start servers**

  In two terminals:
  ```bash
  # Terminal 1
  cd server && npm run dev

  # Terminal 2
  cd webapp && npm run dev
  ```

- [ ] **Step 2: Open an existing event and verify**

  - Open an event form
  - Confirm the new section appears below the Deposit & ACUM row
  - Enter a catering name → save → reopen → confirm value persists
  - Open a second event → type first letter of the catering name → confirm autocomplete suggests the previously entered value
  - Set start time and end time using the time pickers → save → reopen → confirm values persist
  - Enter adult and child guest counts → save → reopen → confirm values persist
  - Confirm `endTime` hint "לאחר חצות = יום למחרת" is visible

- [ ] **Step 3: Create a new event and verify**

  - Open the create-event form
  - Confirm all new fields are present and functional
  - Submit → confirm no console errors

---

## Summary of Changes

| File | Change |
|------|--------|
| `event.prisma` | +5 nullable fields |
| `event.service.ts` | +5 fields to createEventSchema, +getCateringOptions method |
| `event.router.ts` | +getCateringOptions procedure |
| `TimeInput.tsx` | New component |
| `CateringInput.tsx` | New component |
| `EventForm.tsx` | +siteId prop, +5 state vars, +query, +UI section, +auto-save wiring |
