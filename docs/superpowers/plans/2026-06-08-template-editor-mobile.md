# Template Editor Mobile Compatibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `webapp/src/pages/floor-plans/TemplateEditor.tsx` fully usable for editing on touch devices (add/move/rotate/delete/pan/zoom by finger) while keeping desktop working.

**Architecture:** Route all canvas interactions through `@use-gesture/react` (one pipeline for mouse + touch), so gestures are universal and need no device detection. Only the **layout** switches at viewport width `<768px` (desktop 3-pane sidebars → mobile full-screen canvas + `vaul` drawers). Extract the palette, properties panel, and gesture logic into shared units reused by both layouts.

**Tech Stack:** React 19, TypeScript, Vite, tRPC/react-query, Tailwind, `vaul` (existing Drawer), `@use-gesture/react` (new), `lucide-react`.

**Verification note (project-specific):** This repo has **no test runner** (the `test` script is a stub) and we deliberately do not add one. Each task therefore verifies with `npm run tsc` (webapp) + a Playwright touch-emulation check and/or desktop check, then commits. Pinch-zoom is verified manually on a device/emulator — Playwright multi-touch is unreliable. Spec: `docs/superpowers/specs/2026-06-08-template-editor-mobile-design.md`.

**Reference anchors in current `TemplateEditor.tsx`:**
- Component-type sidebar list: ~`815-864`
- Canvas container element (mouse/drag handlers): `866-879`
- Inner transformed canvas (`pan`/`zoom`): `880-886`
- Placed components render (`onMouseDown={handleComponentDrag}`): ~`893-942`
- Snap-line render: ~`960-1066`
- Properties sidebar (`w-64 border-s`): `1069-1124`
- Edit Component dialog: ~`1127-1169`
- Conversions `pixelsToMeters`/`metersToPixels`: `185-197`
- `handleDrop` (HTML5 add): `287-310`
- `handleComponentDrag` (mouse move): `563-…`
- `handleWheel` / `zoomToCenter`: `200-258`
- New-component-type dialog (already added): `componentTypeDialogOpen`, `ComponentTypeFormDialog`

---

## Task 1: Add `@use-gesture/react` and `useIsMobile` hook

**Files:**
- Modify: `webapp/package.json` (dependency)
- Create: `webapp/src/hooks/useIsMobile.ts`

- [ ] **Step 1: Install the gesture library**

Run:
```bash
cd webapp && npm install @use-gesture/react
```
Expected: adds `@use-gesture/react` (v10.x) to `dependencies`; no peer-dep errors against React 19.

- [ ] **Step 2: Create the breakpoint hook**

Create `webapp/src/hooks/useIsMobile.ts`:
```ts
import { useEffect, useState } from 'react'

const MOBILE_QUERY = '(max-width: 767px)' // < 768px = mobile (matches index.css)

/** True when the viewport is below the mobile breakpoint. SSR-safe. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY).matches : false
  )

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setIsMobile(mql.matches)
    setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
```

- [ ] **Step 3: Typecheck**

Run: `cd webapp && npm run tsc`
Expected: PASS (only the pre-existing unrelated `VoiceAssistant.tsx` `trpc.ai` errors, if still present — do not fix here).

- [ ] **Step 4: Commit**

```bash
git add webapp/package.json webapp/package-lock.json webapp/src/hooks/useIsMobile.ts
git commit -m "chore(floor-plans): add @use-gesture/react and useIsMobile hook"
```

---

## Task 2: Extract `ComponentPalette` (behavior-preserving refactor, but tap-to-add)

This extracts the sidebar list into a reusable component and switches items from HTML5-draggable to **tap-to-add** (per spec decision #2). The "new component type" button moves into the palette.

**Files:**
- Create: `webapp/src/components/floor-plans/ComponentPalette.tsx`
- Modify: `webapp/src/pages/floor-plans/TemplateEditor.tsx` (sidebar `815-864`, remove `draggedComponentType` drag wiring)

- [ ] **Step 1: Create the palette component**

Create `webapp/src/components/floor-plans/ComponentPalette.tsx`:
```tsx
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { ComponentType } from './ComponentTypeFormDialog'

interface ComponentPaletteProps {
  componentTypes: ComponentType[] | undefined
  /** Tap a palette item to add one instance to the canvas. */
  onAdd: (componentType: ComponentType) => void
  /** Open the "new component type" dialog. */
  onNewType: () => void
}

export function ComponentPalette({ componentTypes, onAdd, onNewType }: ComponentPaletteProps) {
  const { t } = useTranslation()

  const grouped = (componentTypes ?? []).reduce((acc, ct) => {
    ;(acc[ct.category] ||= []).push(ct)
    return acc
  }, {} as Record<string, ComponentType[]>)

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between gap-2">
        <h2 className="font-medium">{t('templateEditor.components')}</h2>
        <Button variant="outline" size="sm" onClick={onNewType}>
          <Plus className="h-4 w-4 me-1" />
          {t('componentTypes.newComponentType')}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {Object.entries(grouped).map(([category, types]) => (
          <div key={category}>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">{category}</h3>
            <div className="space-y-1">
              {types.map((ct) => (
                <button
                  key={ct.id}
                  type="button"
                  onClick={() => onAdd(ct)}
                  className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted active:bg-muted text-start"
                >
                  <div
                    className="w-8 h-8 flex-shrink-0 border"
                    style={{
                      backgroundColor: ct.color || '#E5E7EB',
                      borderRadius: ct.borderRadius ? `${Math.min(ct.borderRadius, 12)}px` : '2px',
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{ct.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ct.defaultWidthInMeters}m × {ct.defaultHeightInMeters}m
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add `addComponentAtViewCenter` to TemplateEditor**

In `TemplateEditor.tsx`, add a placement helper (used by `onAdd`). Place it near `handleDrop`. It computes the visible-canvas center in meters and applies a cascade offset based on the current component count so repeated adds don't stack:
```tsx
// Drops a new component near the center of the visible canvas, with a small
// cascade offset so repeated taps don't stack on the exact same point.
const addComponentAtViewCenter = (componentType: ComponentType) => {
  if (!templateId || !containerRef.current) return
  const rect = containerRef.current.getBoundingClientRect()
  // Center of the visible viewport, in container (screen) space.
  const screenCenterX = rect.width / 2
  const screenCenterY = rect.height / 2
  // Convert to canvas-local pixels (undo pan/zoom), then to meters.
  const canvasX = (screenCenterX - pan.x) / zoom
  const canvasY = (screenCenterY - pan.y) / zoom
  const cascade = (localComponents.length % 6) * 12 // px, in canvas space
  const xInMeters = pixelsToMeters(canvasX + cascade)
  const yInMeters = pixelsToMeters(canvasY + cascade)
  addComponentMutation.mutate({
    templateId,
    componentTypeId: componentType.id,
    xInMeters,
    yInMeters,
    widthInMeters: componentType.defaultWidthInMeters,
    heightInMeters: componentType.defaultHeightInMeters,
  })
}
```
> Note: `addComponentMutation.onSuccess` already appends to `localComponents` and we auto-select below in Task 5. Keep the existing mutation.

- [ ] **Step 3: Replace the inline sidebar with `<ComponentPalette>`**

In `TemplateEditor.tsx`, replace the sidebar block (the `div.w-64.border-e` containing the header + `ScrollArea` + grouped draggable list, ~`815-864`) with:
```tsx
{/* Sidebar - Component Types (desktop) */}
<div className="w-64 border-e bg-muted/30 hidden md:block">
  <ComponentPalette
    componentTypes={componentTypes}
    onAdd={addComponentAtViewCenter}
    onNewType={() => setComponentTypeDialogOpen(true)}
  />
</div>
```
Add the import at the top: `import { ComponentPalette } from '@/components/floor-plans/ComponentPalette'`.

- [ ] **Step 4: Remove the now-dead HTML5 drag wiring**

In `TemplateEditor.tsx`:
- Delete the `handleDrop` function (`287-310`).
- On the canvas container (`866-879`), remove the `onDragOver={(e) => e.preventDefault()}` and `onDrop={handleDrop}` props.
- Remove `draggedComponentType` state and its `setDraggedComponentType` usages (the palette no longer drags). Remove the `import` of `GripVertical` if now unused.

- [ ] **Step 5: Typecheck**

Run: `cd webapp && npm run tsc`
Expected: PASS (no references to `handleDrop`/`draggedComponentType` remain).

- [ ] **Step 6: Desktop check (Playwright)**

Navigate to `http://localhost:5174/templates/37091a69-a0ad-453a-8273-8fb7e32be821`, screenshot. Expected: sidebar shows component types as tappable rows with a "+"; tapping one adds a component near center (toast "componentAdded"). The "new component type" button still opens the dialog.

- [ ] **Step 7: Commit**

```bash
git add webapp/src/components/floor-plans/ComponentPalette.tsx webapp/src/pages/floor-plans/TemplateEditor.tsx
git commit -m "feat(floor-plans): extract ComponentPalette; replace drag-to-add with tap-to-add"
```

---

## Task 3: Extract `ComponentPropertiesPanel`

Reusable panel for the desktop sidebar and the mobile bottom bar/sheet. Includes rotate buttons (spec #5) and delete; "Edit" opens the existing label/rotation dialog.

**Files:**
- Create: `webapp/src/components/floor-plans/ComponentPropertiesPanel.tsx`
- Modify: `webapp/src/pages/floor-plans/TemplateEditor.tsx` (properties sidebar `1069-1124`)

- [ ] **Step 1: Create the panel**

Create `webapp/src/components/floor-plans/ComponentPropertiesPanel.tsx`:
```tsx
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RotateCcw, RotateCw, Trash2, Pencil } from 'lucide-react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type TemplateComponent = RouterOutput['floorPlans']['templates']['get']['components'][0]

interface ComponentPropertiesPanelProps {
  component: TemplateComponent | null
  /** Rotate by a signed delta in degrees (e.g. +15, -15, +90). */
  onRotate: (deltaDeg: number) => void
  onDelete: () => void
  onEdit: () => void
  /** Compact = mobile bottom bar (icons only); false = full desktop panel. */
  compact?: boolean
}

export function ComponentPropertiesPanel({
  component, onRotate, onDelete, onEdit, compact = false,
}: ComponentPropertiesPanelProps) {
  const { t } = useTranslation()

  if (!component) {
    return compact ? null : (
      <p className="text-sm text-muted-foreground">{t('templateEditor.selectComponent')}</p>
    )
  }

  const rotateControls = (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" onClick={() => onRotate(-15)} aria-label="rotate left">
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={() => onRotate(15)} aria-label="rotate right">
        <RotateCw className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={onEdit} aria-label="edit">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="destructive" size="icon" onClick={onDelete} aria-label="delete">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <div className="font-medium truncate">{component.componentType?.name}</div>
          <div className="text-xs text-muted-foreground">
            {component.widthInMeters.toFixed(1)}m × {component.heightInMeters.toFixed(1)}m · {Math.round(component.rotation)}°
          </div>
        </div>
        {rotateControls}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-muted-foreground">{t('templateEditor.type')}</Label>
        <p className="font-medium">{component.componentType?.name}</p>
      </div>
      <div>
        <Label className="text-muted-foreground">{t('templateEditor.position')}</Label>
        <p className="text-sm">
          X: {component.xInMeters.toFixed(2)}m, Y: {component.yInMeters.toFixed(2)}m
        </p>
      </div>
      <div>
        <Label className="text-muted-foreground">{t('templateEditor.size')}</Label>
        <p className="text-sm">
          {component.widthInMeters.toFixed(2)}m × {component.heightInMeters.toFixed(2)}m
        </p>
      </div>
      {component.label && (
        <div>
          <Label className="text-muted-foreground">{t('templateEditor.label')}</Label>
          <p className="font-medium">{component.label}</p>
        </div>
      )}
      <div className="pt-2">{rotateControls}</div>
    </div>
  )
}
```

- [ ] **Step 2: Add `rotateComponent` + translation key**

In `TemplateEditor.tsx`, add a rotate handler that updates local state and persists (mirrors the edit-dialog save path):
```tsx
const rotateComponent = (id: string, deltaDeg: number) => {
  const target = localComponents.find(c => c.id === id)
  if (!target) return
  const rotation = ((Math.round(target.rotation) + deltaDeg) % 360 + 360) % 360
  setLocalComponents(prev => prev.map(c => (c.id === id ? { ...c, rotation } : c)))
  updateComponentMutation.mutate({ id, rotation })
}
```
Add `templateEditor.selectComponent` to `webapp/src/locales/en/translation.ts` (and `ar`/`he` JSON) with value e.g. `"Select a component to view its properties"` (replace the hardcoded English string at `1122`).

- [ ] **Step 3: Replace the desktop properties sidebar**

Replace the `div.w-64.border-s` block (`1069-1124`) with:
```tsx
{/* Properties panel (desktop) */}
<div className="w-64 border-s bg-background p-4 hidden md:block">
  <h3 className="font-medium mb-4">{t('templateEditor.properties')}</h3>
  <ComponentPropertiesPanel
    component={localComponents.find(c => c.id === selectedComponentId) ?? null}
    onRotate={(d) => selectedComponentId && rotateComponent(selectedComponentId, d)}
    onDelete={() => selectedComponentId && deleteComponentMutation.mutate({ id: selectedComponentId })}
    onEdit={() => {
      const c = localComponents.find(c => c.id === selectedComponentId)
      if (c) handleEditComponent(c)
    }}
  />
</div>
```
Add import: `import { ComponentPropertiesPanel } from '@/components/floor-plans/ComponentPropertiesPanel'`.

- [ ] **Step 4: Typecheck + desktop check**

Run: `cd webapp && npm run tsc` → PASS.
Playwright: select a component → desktop right panel shows type/position/size + rotate/edit/delete buttons; rotate buttons change the rotation (component visibly rotates / value updates).

- [ ] **Step 5: Commit**

```bash
git add webapp/src/components/floor-plans/ComponentPropertiesPanel.tsx webapp/src/pages/floor-plans/TemplateEditor.tsx webapp/src/locales
git commit -m "feat(floor-plans): extract ComponentPropertiesPanel with rotate controls"
```

---

## Task 4: Gesture model via `@use-gesture/react` (pan, pinch, component move, tap-select)

Replace the mouse/Alt-pan/wheel handlers with `useGesture`, working for mouse **and** touch. Single-pointer drag on empty canvas pans; drag on a component moves it (reusing the existing snap logic); pinch zooms; a tap selects/deselects.

**Files:**
- Modify: `webapp/src/pages/floor-plans/TemplateEditor.tsx` (canvas `866-886`, components `893-942`, handlers `200-310`, `563-…`)

- [ ] **Step 1: Extract the move-with-snap core**

The existing `handleComponentDrag` (`563-…`) computes snapped meters from mouse deltas and sets `snapLines`. Refactor its body into a pure helper that both the gesture and (removed) mouse path can call, operating on canvas-space pixel deltas:
```tsx
// Given a component and a desired new center in canvas pixels, apply snapping,
// update localComponents, set snap lines, and mark unsaved. Returns nothing.
const moveComponentToPixels = (id: string, newPxX: number, newPxY: number) => {
  const component = localComponents.find(c => c.id === id)
  if (!component) return
  const xInMeters = pixelsToMeters(newPxX)
  const yInMeters = pixelsToMeters(newPxY)
  // Reuse existing snapping: compute snapped meters + snap lines.
  const snapped = computeSnap(component, xInMeters, yInMeters) // extract from handleComponentDrag
  setLocalComponents(prev => prev.map(c => (c.id === id ? { ...c, xInMeters: snapped.x, yInMeters: snapped.y } : c)))
  setSnapLines(snapped.lines)
  setHasUnsavedChanges(true)
}
```
> Extract the snap math currently inline in `handleComponentDrag` into `computeSnap(component, xMeters, yMeters) => { x, y, lines }`. Keep behavior identical (same `SNAP_THRESHOLD_METERS`, gap logic). On drag end, persist via the existing `updateComponentMutation` / bulk path and clear `snapLines`.

- [ ] **Step 2: Add the gesture bindings**

Add near the other handlers:
```tsx
import { useGesture } from '@use-gesture/react'

// Canvas-level gestures: pan (1-pointer drag on empty) + pinch zoom.
const bindCanvas = useGesture(
  {
    onDrag: ({ delta: [dx, dy], pinching, tap, target }) => {
      if (pinching) return
      if (tap) { setSelectedComponentId(null); return } // tap empty = deselect
      // Only pan when the drag did not start on a component (components stopPropagation).
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
    },
    onPinch: ({ origin: [ox, oy], offset: [scale], memo }) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return memo
      const newZoom = Math.max(0.1, Math.min(8, scale))
      // Keep the pinch midpoint stationary.
      const cx = ox - rect.left
      const cy = oy - rect.top
      const canvasX = (cx - pan.x) / zoom
      const canvasY = (cy - pan.y) / zoom
      setPan({ x: cx - canvasX * newZoom, y: cy - canvasY * newZoom })
      setZoom(newZoom)
      return memo
    },
  },
  { drag: { filterTaps: true, pointer: { touch: true } }, pinch: { from: () => [zoom, 0] } }
)

// Per-component drag: move that component; stopPropagation prevents canvas pan.
const bindComponent = useGesture(
  {
    onDragStart: ({ event }) => event.stopPropagation(),
    onDrag: ({ args: [id], delta: [dx, dy], tap, event }) => {
      event.stopPropagation()
      if (tap) { setSelectedComponentId(id); return } // tap component = select
      const c = localComponents.find(x => x.id === id)
      if (!c) return
      const curPxX = metersToPixels(c.xInMeters)
      const curPxY = metersToPixels(c.yInMeters)
      // delta is in screen px; divide by zoom to canvas px.
      moveComponentToPixels(id, curPxX + dx / zoom, curPxY + dy / zoom)
    },
    onDragEnd: ({ args: [id] }) => {
      setSnapLines([])
      const c = localComponents.find(x => x.id === id)
      if (c) updateComponentMutation.mutate({ id, xInMeters: c.xInMeters, yInMeters: c.yInMeters })
    },
  },
  { drag: { filterTaps: true, pointer: { touch: true } } }
)
```

- [ ] **Step 3: Wire bindings into the JSX**

On the canvas container (`866-879`): remove `onMouseDown`/`onMouseMove`/`onMouseUp`/`onMouseLeave`/`onWheel`, spread `{...bindCanvas()}`, and add `style={{ touchAction: 'none' }}`. Keep `onWheel={handleWheel}` for desktop wheel-zoom (use-gesture pinch does not cover wheel).
On each placed component element (`893-942`): replace `onMouseDown={(e) => handleComponentDrag(component.id, e)}` with `{...bindComponent(component.id)}`. Keep `onDoubleClick={() => handleEditComponent(component)}` for desktop.

- [ ] **Step 4: Remove dead mouse pan code**

Delete `handleCanvasMouseDown`, `handleMouseMove`, `handleMouseUp`, `isPanning`, `panStart`, `isAltPressed` and their `useEffect` key-listeners (Alt/Delete) — except keep a `Delete`-key shortcut only if desired on desktop (optional; mobile uses the panel button). Remove now-unused state.

- [ ] **Step 5: Typecheck**

Run: `cd webapp && npm run tsc` → PASS.

- [ ] **Step 6: Desktop + touch checks (Playwright)**

Desktop: drag a component with the mouse → it moves and snaps; drag empty canvas → pans; wheel+ctrl → zoom; tap empty → deselect.
Touch emulation (Playwright context `hasTouch: true`, mobile viewport): tap-add, one-finger drag a component to move, one-finger drag empty to pan, tap to select/deselect. (Pinch is manual.)

- [ ] **Step 7: Commit**

```bash
git add webapp/src/pages/floor-plans/TemplateEditor.tsx
git commit -m "feat(floor-plans): unified pointer gestures (pan/pinch/move/select) via use-gesture"
```

---

## Task 5: Auto-select on add; cascade confirmed

**Files:**
- Modify: `webapp/src/pages/floor-plans/TemplateEditor.tsx` (`addComponentMutation.onSuccess`)

- [ ] **Step 1: Auto-select the newly added component**

Update `addComponentMutation.onSuccess` (currently appends to `localComponents`) to also select it:
```tsx
onSuccess: (newComponent) => {
  setLocalComponents(prev => [...prev, newComponent])
  setSelectedComponentId(newComponent.id)
  toast.success(t('templateEditor.componentAdded'))
},
```

- [ ] **Step 2: Typecheck + check**

Run: `cd webapp && npm run tsc` → PASS. Playwright: tapping a palette item adds a component, it is selected (properties show it), repeated taps cascade (no exact stacking).

- [ ] **Step 3: Commit**

```bash
git add webapp/src/pages/floor-plans/TemplateEditor.tsx
git commit -m "feat(floor-plans): auto-select component on add"
```

---

## Task 6: Responsive mobile layout (drawers + bottom bar)

Add the `<768px` layout: full-screen canvas, palette in a `vaul` bottom-sheet that stays open during adds, properties as a compact bottom bar expanding to a sheet on Edit.

**Files:**
- Modify: `webapp/src/pages/floor-plans/TemplateEditor.tsx`

- [ ] **Step 1: Add mobile state + hook**

```tsx
import { useIsMobile } from '@/hooks/useIsMobile'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
// ...
const isMobile = useIsMobile()
const [paletteOpen, setPaletteOpen] = useState(false)
```

- [ ] **Step 2: Toolbar — add palette toggle on mobile, hide zoom +/- on mobile**

In the top toolbar, wrap the zoom +/- buttons in `<div className="hidden md:flex …">` (keep reset/fit visible). Add, visible only on mobile, a palette toggle button:
```tsx
{isMobile && (
  <Button variant="outline" size="sm" onClick={() => setPaletteOpen(true)}>
    <Plus className="h-4 w-4 me-1" />
    {t('templateEditor.components')}
  </Button>
)}
```

- [ ] **Step 3: Mobile palette drawer (stays open during adds)**

After the canvas, render (mobile only) a bottom-sheet drawer. Tapping an item adds but does **not** close it:
```tsx
{isMobile && (
  <Drawer open={paletteOpen} onOpenChange={setPaletteOpen}>
    <DrawerContent className="h-[45vh]">
      <ComponentPalette
        componentTypes={componentTypes}
        onAdd={addComponentAtViewCenter}
        onNewType={() => { setPaletteOpen(false); setComponentTypeDialogOpen(true) }}
      />
    </DrawerContent>
  </Drawer>
)}
```
> `addComponentAtViewCenter` already targets the visible center; because the sheet covers the lower ~45%, components land in the upper visible area. Leave `paletteOpen` true after add (multi-add).

- [ ] **Step 4: Mobile properties bottom bar**

Render (mobile only) a fixed bottom bar when a component is selected, using the `compact` panel:
```tsx
{isMobile && selectedComponentId && (
  <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-background">
    <ComponentPropertiesPanel
      component={localComponents.find(c => c.id === selectedComponentId) ?? null}
      compact
      onRotate={(d) => rotateComponent(selectedComponentId, d)}
      onDelete={() => deleteComponentMutation.mutate({ id: selectedComponentId })}
      onEdit={() => {
        const c = localComponents.find(c => c.id === selectedComponentId)
        if (c) handleEditComponent(c)
      }}
    />
  </div>
)}
```
> The existing Edit dialog (`1127-1169`) is already a centered Dialog and works on mobile; no change needed (it satisfies "expand to full sheet"). Optionally swap to a `Drawer` later — out of scope.

- [ ] **Step 5: Ensure desktop sidebars are `hidden md:block` (done in Tasks 2–3) and canvas is full-width on mobile**

The canvas container already `flex-1`; with sidebars `hidden` on mobile it fills the row. Confirm no leftover fixed widths force overflow.

- [ ] **Step 6: Typecheck + mobile check (Playwright touch viewport)**

Run: `cd webapp && npm run tsc` → PASS.
Playwright with a mobile viewport (e.g. 390×844, `hasTouch`): canvas is full-screen; toolbar shows palette toggle, no zoom +/-; opening palette shows the bottom sheet; tapping items adds (sheet stays open); selecting a component shows the bottom bar with rotate/delete/edit.

- [ ] **Step 7: Commit**

```bash
git add webapp/src/pages/floor-plans/TemplateEditor.tsx
git commit -m "feat(floor-plans): responsive mobile layout — palette drawer + properties bottom bar"
```

---

## Task 7: Touch affordances + cleanup

**Files:**
- Modify: `webapp/src/pages/floor-plans/TemplateEditor.tsx`

- [ ] **Step 1: Minimum hit area for components**

For placed components whose rendered `width`/`height` are small, enforce a minimum interactive size on touch without changing visual scale: wrap each component's interactive element so its hit area is ≥ 24px (e.g. add an invisible padding layer when `isMobile`). Keep the visual box at `metersToPixels(...)`.
```tsx
// inside the placed-component element style, ensure pointer target:
// minWidth/minHeight only affect a transparent hit overlay, not the colored box.
```

- [ ] **Step 2: Remove leftover desktop-only cursor/Alt UI**

Remove `isAltPressed`-based cursor classes from the canvas container className (replaced by gestures). Keep `cursor-grab`/`grabbing` for desktop mouse if desired via a simple `isPanningRef`, otherwise drop.

- [ ] **Step 3: Typecheck + checks**

Run: `cd webapp && npm run tsc` → PASS. Touch: small components are tappable/selectable. Desktop: unchanged.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/pages/floor-plans/TemplateEditor.tsx
git commit -m "feat(floor-plans): touch hit-targets and editor cleanup"
```

---

## Task 8: Verification pass + manual pinch

**Files:** none (verification only)

- [ ] **Step 1: Desktop regression (Playwright, mouse)**

Tap-add, drag-move (snaps), pan empty, wheel/ctrl zoom, select→panel rotate/edit/delete, Save persists (reload shows components in place).

- [ ] **Step 2: Mobile flows (Playwright, touch viewport)**

Open palette → multi-add (cascade) → close palette → drag to arrange → tap select → bottom bar rotate/delete → Edit dialog. Capture screenshots.

- [ ] **Step 3: Manual pinch-zoom**

On a real device or browser device-mode with touch, verify two-finger pinch zooms around the midpoint and one-finger pans. Record result in the PR description (this is the accepted automation gap).

- [ ] **Step 4: Final typecheck**

Run: `cd webapp && npm run tsc` → PASS (excluding pre-existing unrelated `VoiceAssistant.tsx` errors).

- [ ] **Step 5: Push**

```bash
git push origin main
```
(Render/Vercel auto-deploy.)

---

## Self-Review (author checklist — completed)

- **Spec coverage:** gating/decouple → Tasks 1,6; tap-to-place + remove DnD → Task 2; properties bottom bar/sheet → Tasks 3,6; multi-add stay-open + cascade → Tasks 2,5,6; rotate buttons → Task 3; extraction (3 units) → Tasks 1–4; verification strategy → Task 8. Library `@use-gesture/react` → Task 1/4. Out-of-scope (calibration, event-layout, backend) untouched. ✓
- **Type consistency:** `ComponentType` imported from `ComponentTypeFormDialog`; `TemplateComponent` from router output; `addComponentAtViewCenter`, `moveComponentToPixels`, `computeSnap`, `rotateComponent` defined before use; `bindCanvas`/`bindComponent` names consistent. ✓
- **Known extraction risk:** `computeSnap` is described as an extraction of existing inline snap math in `handleComponentDrag` — the implementer must lift it verbatim to preserve behavior (same `SNAP_THRESHOLD_METERS`/gap logic). Flagged in Task 4 Step 1.
