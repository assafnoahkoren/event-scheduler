# Event Nickname Field — Design Spec

**Date:** 2026-05-25  
**Status:** Approved

## Summary

Add an optional short internal alias ("nickname") to events. It appears in the event form and, when exactly one non-cancelled event exists on a calendar day, under that day's number in the calendar cell.

## Data Layer

- Add `nickname String?` to `server/prisma/schema/events/event.prisma`
- Add `nickname: z.string().optional()` to `createEventSchema` in `server/src/services/event.service.ts`
- `updateEventSchema` inherits it automatically via `.partial()`
- Pass `nickname` through in the `createEvent` and `updateEvent` Prisma calls

## Form (`webapp/src/components/EventForm.tsx`)

- Add an optional "Nickname" text input below the Title field
- Translated label consistent with other fields
- No validation — free-form, optional

## Calendar Cell (`webapp/src/components/EventCalendar.tsx` → `CalendarCell`)

- Condition: `nonMeetingEvents.length === 1` and `nonMeetingEvents[0].nickname` is non-empty
- Render the nickname as a small text line directly under the day number
- Style: `text-xs text-gray-500` (small, muted, non-competing)
- No fallback — if no nickname is set, nothing is shown

## Out of Scope

- Showing nickname in search results, event detail header, or EventCard
- Nickname validation or uniqueness constraints
