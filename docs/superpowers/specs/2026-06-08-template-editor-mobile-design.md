# Template Editor — Mobile Compatibility Design

**Date:** 2026-06-08
**Status:** Approved design (pending implementation plan)
**Area:** `webapp/src/pages/floor-plans/TemplateEditor.tsx` (floor-plan template editor)

## Goal

Make the floor-plan **TemplateEditor** fully usable for **editing on touch devices** (phone-first), while keeping the existing desktop experience working. The app is already mobile-first (drawer-based UI, 16px inputs, `max-w-*` containers, RTL); the TemplateEditor is the one desktop-only holdout.

"Full editing on touch" means: add, move, rotate, delete components, plus pan and zoom — all by finger.

## Background — why this is non-trivial

The current editor's interactions are all mouse/desktop-only and do not fire on touch:

- **Add component:** HTML5 drag-and-drop (`draggable` + `onDragStart`/`onDrop`) — does not work on touch.
- **Move component:** `onMouseDown` → `handleComponentDrag` (mouse events).
- **Pan:** Alt+drag or middle-mouse.
- **Zoom:** Ctrl/Cmd+wheel or +/- buttons.
- **Delete:** `Delete` key.

So this is an interaction rework, not just a responsive-layout change. The coordinate math already exists (`pixelsToMeters` / `metersToPixels`, `pan`, `zoom`, snap guides) and is **reused unchanged**; only the event plumbing and layout change.

## Decisions (resolved via design review)

1. **Gating — decouple gestures from layout.**
   Gestures are routed through `@use-gesture/react`, which handles **mouse and touch through one pipeline**, so gestures are **always on** with no device detection. Only the **layout** switches on a **viewport-width breakpoint of `<768px`** (matches the existing `index.css` media query). Consequence: a touchscreen laptop or a tablet ≥768px keeps the 3-pane layout but still has full gesture support.

2. **Add component — tap-to-place everywhere; remove HTML5 DnD.**
   One add-path for all devices. Tapping a palette item drops a component into the **visible canvas area** (see #4). The HTML5 drag-and-drop code is deleted. Desktop users position via the same drag-to-move gesture (mouse).

3. **Properties on mobile — compact bottom bar, expand on Edit.**
   Selecting a component shows a thin bottom bar (name + Rotate + Delete + Edit). The canvas stays visible so the user can position while tweaking. Tapping **Edit** opens the full sheet (label, precise rotation). Desktop keeps the right-hand properties sidebar.

4. **Multi-add — palette stays open, cascade offset.**
   The palette drawer **stays open** while adding; each tap drops one component with a **small cascade offset** (no stacking) into the **visible** canvas region (the area not covered by the open palette sheet). User closes the palette manually to switch to "arrange mode." Two clear modes: **palette open = add**, **palette closed = arrange**.

5. **Rotation on touch — stepped buttons + sheet field.**
   Rotate via ±15° (and ±90°) buttons in the bottom bar; precise numeric/slider in the expanded sheet (the rotation field already exists). Desktop keeps the existing drag-handle. No two-finger rotate (would conflict with pinch).

6. **Structure — extract 3 shared units.**
   The palette and properties UI each render in two containers (desktop sidebar + mobile drawer/bar), so they are extracted to avoid duplicated markup:
   - `ComponentPalette` — grouped, tappable list of component types (+ the "new component type" button already added).
   - `ComponentPropertiesPanel` — name / rotate / delete / edit.
   - `useCanvasGestures` — wraps `useGesture`; owns pan/zoom/move wiring against existing state.
   `TemplateEditor` becomes orchestration + layout.

7. **Verification — Playwright (single-touch) + desktop regression + manual pinch.**
   Playwright touch-emulation covers tap-to-add, drag-move, one-finger pan, select→bottom-bar, delete, drawer open/close; desktop mouse regression covers the unchanged 3-pane path. **Pinch-zoom is verified manually** on a device/emulator (Playwright multi-touch is unreliable). No new test framework is introduced (the project currently has zero tests). The pinch automation gap is accepted and recorded here.

## Library

`@use-gesture/react` (latest v10.x, React 19-compatible) used **standalone** — no `react-spring`. Gesture handlers update the editor's existing `pan`/`zoom`/component state directly.

## Layout

### Desktop (≥768px) — structurally unchanged
`[ ComponentPalette sidebar | Canvas | ComponentPropertiesPanel sidebar ]`, top toolbar with back · zoom controls · save · "new component type".

### Mobile (<768px)
- **Canvas fills the screen.**
- **Top toolbar** compresses: back · save · "new component type" · **palette toggle**. Zoom +/- buttons are **hidden** (pinch replaces them); a **reset/fit** control is kept.
- **Palette** = bottom-sheet `vaul` Drawer (partial height, draggable), reusing the app's `useDrawerBackButton` so Android back closes it. Renders `ComponentPalette`. Stays open during add (#4).
- **Properties** = compact bottom bar on selection (#3), expanding to a full bottom sheet on Edit, rendering `ComponentPropertiesPanel`.

## Gesture model (`useCanvasGestures`)

- **Component move:** per-component drag binding (`bind(componentId)` spread on each component element); `stopPropagation` so the canvas does not also pan. Reuses existing meters conversion + snap-guide logic.
- **Pan:** single-pointer drag starting on **empty canvas** (replaces Alt+drag — Alt no longer required on desktop either).
- **Zoom:** `onPinch` around the pinch midpoint (reuses the existing zoom-to-point math); desktop keeps Ctrl/wheel zoom.
- **Select / deselect:** a tap (drag below movement threshold) on a component selects it; a tap on empty canvas deselects.
- **Add at visible center:** new `addComponentAtViewCenter(type)` computes the center of the *visible* canvas region (excluding the open palette sheet) in meters from current `pan`/`zoom`, applies the cascade offset, and calls the existing `addComponent` mutation; the new component is auto-selected.
- Canvas gets `touch-action: none` so the browser does not scroll/zoom-fight the gestures.

## Files

**New**
- `webapp/src/hooks/useIsMobile.ts` — `matchMedia('(max-width: 767px)')`.
- `webapp/src/components/floor-plans/ComponentPalette.tsx`
- `webapp/src/components/floor-plans/ComponentPropertiesPanel.tsx`
- `webapp/src/hooks/useCanvasGestures.ts` (or co-located under floor-plans)

**Changed**
- `webapp/src/pages/floor-plans/TemplateEditor.tsx` — layout split (desktop sidebars vs mobile drawers/bar), gesture wiring, tap-to-place, removal of HTML5 DnD and `Delete`-key/Alt-pan dependencies.
- `webapp/package.json` — add `@use-gesture/react`.

## Out of scope (explicitly)

- **Calibration bug** (`pixelsPerMeter` can be set to a nonsensical value, making components render sub-pixel). This is independent of touch support and is tracked separately; it affects whether placed components are *visibly sized* regardless of input device.
- Event-layout (per-event) editing — only the **template** editor is in scope.
- Any backend/router changes — this is a frontend-only change.

## Success criteria

- On a phone: open the editor, open the palette, tap to add several components (cascade, no stacking), drag to position, pinch to zoom, one-finger pan, select → bottom bar → rotate/delete, Edit → full sheet. No reliance on hover, right-click, keyboard, or HTML5 drag.
- On desktop: existing flows still work (tap-to-add now instead of drag-from-sidebar; mouse drag to move/pan; wheel/buttons to zoom).
- `npm run tsc` clean in webapp.
