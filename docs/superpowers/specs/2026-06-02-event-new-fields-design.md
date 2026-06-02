# Event Model New Fields Design

**Date:** 2026-06-02

## Summary

Add five new fields to the Event model:
- `catering` — free text with site-wide autocomplete from historical values
- `startTime` — time-only (HH:mm), when guests are invited / event practically starts
- `endTime` — time-only (HH:mm), when the event ends; values in early AM (e.g., 02:00) are treated as next day
- `guestCountAdults` — integer count of adult guests invited
- `guestCountChildren` — integer count of child guests invited

---

## 1. Schema (Prisma)

File: `server/prisma/schema/events/event.prisma`

Add to the `Event` model:

```prisma
catering           String?  @map("catering")
startTime          String?  @map("start_time")         // HH:mm
endTime            String?  @map("end_time")            // HH:mm
guestCountAdults   Int?     @map("guest_count_adults")
guestCountChildren Int?     @map("guest_count_children")
```

All fields are nullable so existing events are unaffected. One Prisma migration required.

---

## 2. Backend (tRPC)

File: `server/src/routers/event.router.ts` and related schema/validation files.

### Zod schema updates
Add to `createEventSchema` and `updateEventSchema`:
```typescript
catering:           z.string().optional(),
startTime:          z.string().regex(/^\d{2}:\d{2}$/).optional(),
endTime:            z.string().regex(/^\d{2}:\d{2}$/).optional(),
guestCountAdults:   z.number().int().min(0).optional(),
guestCountChildren: z.number().int().min(0).optional(),
```

### New query: `event.getCateringOptions`
Returns distinct non-null catering strings for the current site, used by the autocomplete.

```typescript
// Input: { siteId: string }
// Output: string[]
prisma.event.findMany({
  where: { siteId, catering: { not: null }, isDeleted: false },
  select: { catering: true },
  distinct: ['catering'],
})
// map to string[], filter empty strings
```

---

## 3. UI

### New component: `TimeInput`

File: `webapp/src/components/ui/TimeInput.tsx`

- Wraps native `<input type="time">` styled to match existing form inputs
- Props: `value: string | undefined`, `onChange: (val: string | undefined) => void`, `label: string`, `placeholder?: string`
- Returns value as `"HH:mm"` string or `undefined` when cleared

### Updated `EventForm.tsx`

Add a new section below the existing fields with three rows:

```
Row 1: [ קייטרינג — autocomplete text input (full width) ]
Row 2: [ שעת התחלה  TimeInput ] [ שעת סיום  TimeInput ]
Row 3: [ מבוגרים  number input ] [ ילדים  number input ]
```

- `endTime` field shows a small hint label: "שעות אחרי חצות = יום למחרת" (early AM = next day)
- Catering input fetches options via `event.getCateringOptions` on focus (once per form mount), filters client-side as user types
- `EventFormData` type updated via tRPC inference (`inferRouterInputs`) — no manual interface duplication

### Autocomplete behavior
- Dropdown appears on focus if there are existing options
- Filters case-insensitively as user types
- User can type a completely new value not in the list (free text)
- Options sourced from `event.getCateringOptions` (distinct catering values for this site)

---

## Out of Scope

- No "confirmed catering" boolean (kept as free text only)
- No separate `CateringProvider` table
- No derived "total guests" field (adults + children shown separately)
- The "next day" assumption for `endTime` is a display/UX convention only — not enforced in DB or validation
