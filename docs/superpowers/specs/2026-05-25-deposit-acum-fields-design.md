# Deposit & ACUM Fields on Event Design

## Goal

Add two new fields to the Event model:
1. `depositAmount` — an optional number recording how much deposit (מקדמה) the client paid
2. `acumPaid` — a boolean recording whether the ACUM license fee was paid for this event

Both fields appear in the event form and are visualised in the calendar cell as coloured icons.

## Architecture

Two scalar fields are added directly to the `Event` Prisma model. They flow through the existing Zod `createEventSchema` → `updateEventSchema` (via `.partial()`) → tRPC router → `EventForm` → all mutation call sites. No new tables or relations are needed.

## Data Model

```prisma
depositAmount Float?   @map("deposit_amount")
acumPaid      Boolean  @default(false) @map("acum_paid")
```

`depositAmount` is nullable — null means the field was never set. `0` means it was explicitly set to zero (no deposit paid).

## Zod Schema

Added to `createEventSchema` in `server/src/services/event.service.ts`:

```typescript
depositAmount: z.number().optional(),
acumPaid:      z.boolean().optional(),
```

`updateEventSchema` picks these up automatically via `.partial()`.

## Form UI (`webapp/src/components/EventForm.tsx`)

Two new fields added after the existing description/location fields:

- **Deposit** — a number `<Input type="number" min="0">` bound to `depositAmount` state. Empty input submits `undefined`.
- **ACUM Paid** — a `<Checkbox>` (shadcn) bound to `acumPaid` state. Defaults to `false`.

`EventFormData` gains:
```typescript
depositAmount?: number
acumPaid?: boolean
```

Both fields are threaded through `handleSubmit`.

## Mutation Call Sites

`depositAmount` and `acumPaid` are added to the mutation payload in:
- `webapp/src/pages/Event.tsx` — `handleUpdate`
- `webapp/src/components/EventCalendar.tsx` — `createEventMutation.mutate`
- `webapp/src/components/WaitingListMatchNotification.tsx` — `createEventMutation.mutate`

## Calendar Cell Icons

Displayed in the top-start corner (`absolute top-0.5 start-0.5`) of `CalendarCell` when `nonMeetingEvents.length === 1` and `isCurrentMonth`:

- `DollarSign` icon (lucide-react, `w-3 h-3`): green (`text-green-500`) if `depositAmount > 0`, red (`text-red-500`) otherwise
- `Music` icon (lucide-react, `w-3 h-3`): green (`text-green-500`) if `acumPaid === true`, red (`text-red-500`) otherwise

Icons sit side-by-side in a `flex gap-0.5` wrapper, `pointer-events-none`.

## Translations

Three locale files updated (`en/translation.ts`, `he/translation.json`, `ar/translation.json`) under the `events` key:

| Key | EN | HE | AR |
|---|---|---|---|
| `depositAmount` | `"Deposit"` | `"מקדמה"` | `"دفعة مقدمة"` |
| `acumPaid` | `"ACUM Paid"` | `'אקו"מ שולם'` | `"رسوم أكوم مدفوعة"` |

## Migration

```sql
ALTER TABLE "public"."events"
  ADD COLUMN "deposit_amount" DOUBLE PRECISION,
  ADD COLUMN "acum_paid"      BOOLEAN NOT NULL DEFAULT false;
```
