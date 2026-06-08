# Event Floor Plan Layout — Design Spec

**Date:** 2026-06-08
**Status:** Approved (pending written-spec review)

## Goal

Let a user instantiate a floor plan **template** into a specific **event** as an editable, event-specific copy ("layout"), then edit that copy with the existing drag/pan/pinch floor plan editor. Edits to the event's layout never touch the source template.

## Background / Current State

The backend is already ~95% built and **entirely unused by the webapp** (no frontend file references `eventLayouts`). The data model and router already exist:

- **`EventFloorPlanLayout`** — a per-event copy of a floor plan. Unique constraint `@@unique([eventId, floorPlanId])`. Relation on `Event.floorPlanLayouts`.
- **`EventLayoutComponent`** — placed components on a layout. Same fields as `FloorPlanTemplateComponent`: `componentTypeId, xInMeters, yInMeters, widthInMeters, heightInMeters, rotation, label`.
- **`eventLayouts` router** (`server/src/routers/floor-plans/event-layouts.router.ts`) — `list({ eventId })`, `get({ id })`, `create`, **`createFromTemplate({ eventId, templateId, name? })`**, `update`, `delete`, `addComponent`, `updateComponent`, `deleteComponent`, `bulkUpdateComponents`. These mirror the templates router exactly; the only difference is the id field (`layoutId` vs `templateId`).

`createFromTemplate` already copies every template component into a new layout in a transaction and returns the new layout with its `id` (suitable for immediate navigation). It enforces the one-layout-per-floor-plan constraint server-side.

This feature is therefore **almost entirely frontend**, plus one small backend convenience procedure.

## Scope Decisions (YAGNI)

- **One layout per event.** Even though the model allows one layout *per floor plan* (so technically several per event), the UI exposes exactly one layout per event for now. No layout list, no multi-space UI, no per-floor-plan conflict handling in the picker.
- **Full editing** of the event's layout via the existing editor (not view-only).
- **One-step flat picker:** a single flat list of *all* templates across the site's floor plans (grouped by floor-plan name for labelling), not a two-step floor-plan→template drill-down.
- **Create immediately** on template tap, named after the template; rename-later is out of scope (the layout name is just the template name).
- **No live canvas thumbnail** in the tab — a summary card that opens the full editor is enough.
- **Event page tab cleanup:** Only the Details tab is currently used. Comment out the other six tabs (preserve code) and add the new Floor Plan tab.

## Architecture

Three units of work:

### 1. Backend — one new procedure

Add `floorPlans.templates.listBySite({ siteId }) → Template[]` to `templates.router.ts`.

- Queries non-deleted templates where `floorPlan.siteId === siteId`.
- Each row includes its `floorPlan` name (so the picker can group/label).
- Reuses the existing `checkSiteAccess(userId, siteId)` guard (same pattern as `siteFloorPlans.list`).
- **No schema changes, no migration.**

Rationale: the picker needs all templates for the event's site in one flat list. Without this, the client would fetch the site's floor plans and fire one `templates.list` query per plan (N+1).

### 2. Frontend — generalize the editor via a data-adapter hook

The current `TemplateEditor.tsx` calls `trpc.floorPlans.templates.*` directly in 7 places. Pull those behind one hook so the editor is data-source-agnostic.

**New hook `useFloorPlanEditorData.ts`:**

```ts
type Source =
  | { kind: 'template';    id: string }
  | { kind: 'eventLayout'; id: string }

function useFloorPlanEditorData(source: Source) {
  // switches on source.kind → templates.* or eventLayouts.*
  return {
    data,                  // { name, floorPlan: { imageFile, pixelsPerMeter }, components[] }
    isLoading,
    componentTypes,        // shared: componentTypes.list (identical both sides)
    addComponent,          // input without the id field
    updateComponent,
    updateComponentSilent,
    deleteComponent,
    bulkUpdate,
    invalidate,            // refetch this source after mutations
  }
}
```

- Both routers return **identically-shaped** data, so the hook normalizes only the input id field (`templateId` vs `layoutId`) and the cache key to invalidate. The editor's render/gesture/snap logic is unchanged.
- **Rename** `TemplateEditor.tsx` → `FloorPlanEditor.tsx` (it is no longer template-specific). It takes `source` and a `backTo` target, and consumes the hook instead of calling trpc directly. The stabilized canvas/touch/resize/selection logic is moved verbatim.
- **Two thin route wrappers** select the source:
  - `/templates/:templateId` → `<FloorPlanEditor source={{ kind: 'template', id: templateId }} backTo={/floor-plans/:floorPlanId} />`
  - `/event/:eventId/floor-plan/:layoutId` → `<FloorPlanEditor source={{ kind: 'eventLayout', id: layoutId }} backTo={/event/:eventId?tab=floor-plan} />`

Net effect: one editor, two data sources; every fix already landed (touch-vs-pan, ResizeObserver, capture-phase selection) applies to both for free. Risk is contained to relocating identical trpc calls into the hook.

### 3. Frontend — the event "Floor Plan" tab

**`Event.tsx` tab changes:**
- Keep the **Details** tab (`?tab=details`).
- Comment out (do not delete) the `TabsContent` blocks and footer nav buttons for: Products, Services, Waiting list, Tasks, Finances, Files.
- Add a **Floor Plan** tab (`?tab=floor-plan`): new `TabsContent` + new footer nav button (icon e.g. `LayoutGrid`).
- Result: 2-tab event page, 2-icon footer.

**New component `EventFloorPlanTab.tsx`** — calls `eventLayouts.list({ eventId })`:

- **Empty (no layout):** empty-state card with an "Add floor plan" button. Tapping opens a **picker** (Drawer/Dialog, matching existing mobile-first patterns) listing `templates.listBySite({ siteId })`, grouped by floor-plan name, each row showing the template name.
  - Tap a template row → `createFromTemplate({ eventId, templateId, name: template.name })` → on success navigate to `/event/:eventId/floor-plan/:newLayoutId`.
  - If the site has no templates at all, the picker shows a "no templates yet" message.
- **Has a layout:** a summary card (layout name + component count, e.g. "Main Hall · 12 items") with **Open** (→ editor route) and **Remove** (confirm dialog → `eventLayouts.delete` → back to empty state).

**Routing:** add `/event/:eventId/floor-plan/:layoutId` to the webapp router (`App.tsx`), rendering the event-layout wrapper around `FloorPlanEditor`. Editor "back" returns to `/event/:eventId?tab=floor-plan`.

**Access control:** gate Add / Remove / editing on the same `canEdit` the other event tabs use; viewers see the layout read-only. The router already enforces role server-side.

**i18n:** add keys to all three locales (`en`, `he`, `ar`) — tab label, empty-state text, picker title, "add floor plan", "remove", and the remove-confirm dialog. RTL is handled globally.

## Data Flow

1. User opens an event → Floor Plan tab → `eventLayouts.list({ eventId })`.
2. No layout → "Add floor plan" → picker → `templates.listBySite({ siteId })`.
3. Tap template → `createFromTemplate({ eventId, templateId, name })` → returns new layout `{ id }`.
4. Navigate to `/event/:eventId/floor-plan/:layoutId` → `FloorPlanEditor` with `source={{ kind:'eventLayout', id }}` → `eventLayouts.get({ id })`.
5. Edits (move/rotate/add/delete) → `eventLayouts.*` mutations via the adapter hook → invalidate the layout query. Template is untouched.
6. Back → event Floor Plan tab now shows the summary card. Remove → `eventLayouts.delete` → empty state.

## Error Handling

- `createFromTemplate` conflict (layout already exists for that floor plan) — cannot occur in the one-layout-per-event UI (picker only shown when no layout exists), but if it surfaces, show the returned error toast.
- Picker with zero templates → explicit empty message, not a blank list.
- Editor on a missing/deleted layout (`get` returns null) → not-found state, back to event.
- All mutations surface errors via the existing toast pattern.

## Testing / Verification

Project has no test runner (test script is a stub), so verify per established pattern:

- `npm run tsc` clean in both `server` and `webapp`.
- Manual / Playwright walkthrough:
  1. Event → Floor Plan tab → empty state.
  2. Add floor plan → picker lists site templates → tap one → editor opens with all components copied.
  3. Move a component → persists to the **layout**; open the source template separately → unchanged.
  4. Back → summary card shows correct component count.
  5. Remove → confirm → empty state.
- Regression: the existing template editor (`/templates/:templateId`) still works unchanged after the `FloorPlanEditor` rename and hook extraction.

## File Summary

**Backend**
- Modify: `server/src/routers/floor-plans/templates.router.ts` — add `listBySite`.

**Frontend**
- Create: `webapp/src/hooks/useFloorPlanEditorData.ts` — data-adapter hook.
- Rename + refactor: `webapp/src/pages/floor-plans/TemplateEditor.tsx` → `FloorPlanEditor.tsx` — consume hook, accept `source` + `backTo` props.
- Create: route wrappers for `/templates/:templateId` and `/events/:eventId/floor-plan/:layoutId` (thin components, or inline in `App.tsx`).
- Create: `webapp/src/components/event-tabs/EventFloorPlanTab.tsx` — list/empty-state + picker + summary card.
- Create: picker component (e.g. `EventFloorPlanPicker.tsx`) — flat template list grouped by floor plan.
- Modify: `webapp/src/pages/Event.tsx` — comment out 6 tabs, add Floor Plan tab + footer button.
- Modify: `webapp/src/App.tsx` — add event-layout editor route.
- Modify: `webapp/src/locales/{en,he,ar}/translation.ts` — new i18n keys.

## Out of Scope

- Multiple layouts per event / multi-space UI.
- Renaming a layout after creation.
- Live canvas thumbnail in the tab.
- Re-syncing a layout when its source template later changes (the copy is a one-time snapshot).
- Restoring/un-commenting the other six event tabs.
