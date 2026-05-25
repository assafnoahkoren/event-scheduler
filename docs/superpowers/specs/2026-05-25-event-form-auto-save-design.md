# EventForm Auto-Save Design

**Date:** 2026-05-25

## Overview

Add debounced auto-save to `EventForm` in update mode, replacing the manual Save button with a visual status indicator.

## Scope

- **In scope:** `webapp/src/components/EventForm.tsx`, optional prop addition to `EventDetailsTab.tsx`
- **Out of scope:** Create mode behavior, other form components

## Behavior

### Update mode (`event` prop present)
- Every field change triggers a 1000ms debounced call to `onSubmit`.
- Debounce resets on each new change — rapid edits do not spam the API.
- Auto-save only fires when `title.trim().length > 0` (existing validity check).
- The Save button is hidden; a status indicator replaces it.

### Create mode (`event` prop absent)
- Unchanged: explicit Submit button, no auto-save logic runs.

## Status Indicator

Sits in the actions row (end-aligned), visible only in update mode. Four states:

| State | Trigger | Display |
|-------|---------|---------|
| `idle` | Initial / after saved fades | Nothing shown |
| `saving` | `isSubmitting === true` | "Saving..." muted text |
| `saved` | `isSubmitting` transitions false→false after a save | "Saved ✓" fades out after 2s → idle |
| `error` | `saveError === true` | "Failed to save" in red |

## Props Changes

| Prop | Change | Notes |
|------|--------|-------|
| `isSubmitting` | Unchanged | Maps to `saving` state |
| `saveError` | New, optional `boolean` | Parent passes `updateMutation.isError` |
| All others | Unchanged | Fully backward-compatible |

## Implementation

### Debounce
- Implemented with `useRef<ReturnType<typeof setTimeout>>` + `clearTimeout` — no new dependency.
- A `useEffect` watches all field state values; in update mode it schedules the debounced call.
- Cleanup: `clearTimeout` on unmount and before each new schedule.

### Save status state
- Local `saveStatus: 'idle' | 'saving' | 'saved' | 'error'` state.
- `isSubmitting` true → `saving`.
- `isSubmitting` transitions from true → false (and no error) → `saved`, then a 2s `setTimeout` resets to `idle`.
- `saveError` true → `error`.

### Actions row
- Update mode: renders only the status indicator (no Save or Cancel button).
- Create mode: renders Cancel (if `onCancel`) and Submit button as today.

## Files to Modify

1. `webapp/src/components/EventForm.tsx` — all logic lives here.
2. `webapp/src/components/event-tabs/EventDetailsTab.tsx` — pass `saveError={isUpdating === false && updateMutation.isError}` (optional, for error state).
3. `webapp/src/pages/Event.tsx` — may need to expose `updateMutation.isError` down to `EventDetailsTab`.

## Non-goals

- No retry logic on error — parent already has error handling.
- No optimistic UI — save is real-time via existing mutation.
- No i18n for status strings at this stage (can be added later).
