# Event Search Design

**Date:** 2026-05-25

## Overview

Add a search bar above the `EventCalendar` on the Home page. When focused, a white overlay appears below the search bar showing results. Search is live (debounced 300ms) and covers all events for the current site. Results are sorted future-first.

## Search Fields

- **Title** — case-insensitive substring match
- **Description** — case-insensitive substring match
- **Client name** — case-insensitive substring match via the `client` relation
- **Date (dd/mm)** — if query matches `dd/mm` format, matches that calendar day across last year, current year, and next year

## Backend

### New tRPC procedure: `events.search`

**Input:**
```ts
{ siteId: string (uuid), query: string }
```

**Service method: `searchEvents`**

1. Verify the user has access to the site (same pattern as `getEvents`).
2. Build a Prisma `OR` filter:
   - `title: { contains: query, mode: 'insensitive' }`
   - `description: { contains: query, mode: 'insensitive' }`
   - `client: { name: { contains: query, mode: 'insensitive' } }`
   - If `query` matches `/^(\d{1,2})\/(\d{1,2})$/`: add three date-range OR clauses (one per year: last year, current year, next year), each matching `startDate` on that exact calendar day (00:00:00–23:59:59).
3. Run `prisma.event.findMany` with the OR filter, including `client` and `creator`.
4. Sort results in the service layer: future events (startDate ≥ now) ascending, past events (startDate < now) descending — concatenated.

**Returns:** Same shape as `events.list`.

### Schema

```ts
export const searchEventsSchema = z.object({
  siteId: z.string().uuid(),
  query: z.string().min(1),
})
```

## Frontend

### New component: `EventSearchBar`

**File:** `webapp/src/components/EventSearchBar.tsx`

**Props:** none (reads `currentSite` from context internally)

**State:**
- `query: string` — raw input value
- `isFocused: boolean` — whether the input is focused
- `debouncedQuery: string` — debounced (300ms) version of `query`

**Behavior:**
- Calls `trpc.events.search.useQuery({ siteId, query: debouncedQuery })` only when `debouncedQuery.length >= 2`
- Overlay appears when `isFocused && query.length >= 2`
- Clicking outside (via `useRef` + click-outside listener) or pressing Escape closes the overlay and clears focus
- Clicking a result navigates to the event detail page (same as `EventCard` default behavior) and closes the overlay

**Overlay UI:**
- Fixed-position white panel, rendered below the search bar
- High `z-index` so it sits above the calendar and other content
- Scrollable list of results rendered with the existing `EventCard` component
- Loading indicator while fetching
- Empty state message when query >= 2 chars but no results found

### Integration in `Home.tsx`

Place `<EventSearchBar />` directly above `<EventCalendar />` inside the `currentSite` branch.

## RTL & i18n

- Use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`) per project convention
- Add translation keys for: search placeholder, empty state message

## Type Safety

Use `inferRouterInputs` / `inferRouterOutputs` from `@trpc/server` — no hand-written interfaces.
