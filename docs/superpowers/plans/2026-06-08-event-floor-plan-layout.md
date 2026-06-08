# Event Floor Plan Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user instantiate a floor plan template into an event as an editable, event-specific copy ("layout"), editable in the existing drag/pan/pinch floor plan editor.

**Architecture:** The backend already has the full `eventLayouts` router (including `createFromTemplate`) and the `EventFloorPlanLayout` / `EventLayoutComponent` tables — all unused by the webapp. This work is almost entirely frontend: add one backend convenience query (`templates.listBySite`), generalize the existing `TemplateEditor` into a source-agnostic `FloorPlanEditor` via a data-adapter hook, and add a "Floor Plan" tab to the event page that creates and opens the layout.

**Tech Stack:** tRPC + Prisma + Zod (server), React 19 + Vite + TypeScript + Tailwind + react-i18next + @use-gesture/react (webapp). Spec: `docs/superpowers/specs/2026-06-08-event-floor-plan-layout-design.md`.

## Testing Note (read first)

**This project has no unit-test runner** (the `test` script is a stub). Per the project's established pattern, each task is verified by:
- **Type check** — `cd server && npm run tsc` and/or `cd webapp && npm run tsc` (the real safety net here — tRPC inference + type-safe i18n catch most mistakes at compile time).
- **Manual / Playwright walkthrough** for behavioral tasks.

Where this plan says "test", it means run the type check and the described manual check. Do **not** invent a Jest/Vitest harness.

**Pre-existing errors to ignore:** `webapp` has unrelated TS errors in `VoiceAssistant.tsx` (`trpc.ai.*` — the `ai` router is commented out). These are not yours to fix; a task's tsc step is "clean" if it introduces **no new** errors beyond those.

## File Structure

**Backend**
- Modify `server/src/routers/floor-plans/templates.router.ts` — add `listBySite` query (all templates for a site, with floor-plan name).

**Frontend**
- Create `webapp/src/hooks/useFloorPlanEditorData.ts` — data-adapter hook; selects templates-vs-eventLayouts router by `source.kind`, normalizes id fields, exposes a uniform interface.
- Rename + refactor `webapp/src/pages/floor-plans/TemplateEditor.tsx` → `FloorPlanEditor.tsx` — presentational editor consuming the hook; takes `source` + `getBackHref` props. Canvas/gesture/snap logic unchanged.
- Create `webapp/src/pages/floor-plans/TemplateEditorRoute.tsx` — thin wrapper for `/templates/:templateId`.
- Create `webapp/src/pages/floor-plans/EventLayoutEditorRoute.tsx` — thin wrapper for `/event/:eventId/floor-plan/:layoutId`.
- Modify `webapp/src/App.tsx` — swap the template route to the wrapper, add the event-layout editor route.
- Create `webapp/src/components/event-tabs/EventFloorPlanPicker.tsx` — flat template picker (Drawer), grouped by floor plan, creates the layout.
- Create `webapp/src/components/event-tabs/EventFloorPlanTab.tsx` — empty-state + picker, or summary card with Open/Remove.
- Modify `webapp/src/pages/Event.tsx` — comment out 6 unused tabs, add the Floor Plan tab + footer button, change footer grid to 2 columns.
- Modify `webapp/src/locales/{en,he,ar}/translation.ts` — add `eventFloorPlan` keys.

---

## Task 1: Backend — `templates.listBySite`

**Files:**
- Modify: `server/src/routers/floor-plans/templates.router.ts` (insert after the `list` procedure, which ends at line 106)

- [ ] **Step 1: Add the `listBySite` procedure**

In `templates.router.ts`, immediately after the `list` procedure (after its closing `}),` around line 106) and before the `get` procedure, insert:

```ts
  // List all templates across every floor plan of a site (for the event picker)
  listBySite: protectedProcedure
    .input(z.object({ siteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await checkSiteAccess(ctx.user.id, input.siteId)

      const templates = await prisma.floorPlanTemplate.findMany({
        where: {
          isDeleted: false,
          floorPlan: {
            siteId: input.siteId,
            isDeleted: false,
          },
        },
        include: {
          floorPlan: {
            select: { id: true, name: true },
          },
        },
        orderBy: [
          { floorPlan: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
        ],
      })

      return templates
    }),
```

Note: `checkSiteAccess` is already imported at the top of the file (line 5). No new imports needed.

- [ ] **Step 2: Type-check the server**

Run: `cd server && npm run tsc`
Expected: clean (no errors).

- [ ] **Step 3: Manual sanity check (optional but recommended)**

If the dev server is running, confirm the procedure resolves (e.g. via the tRPC panel or a quick client call) and returns templates whose floor plans belong to the given `siteId`, each row carrying `floorPlan: { id, name }`. An empty array for a site with no templates is correct.

- [ ] **Step 4: Commit**

```bash
git add server/src/routers/floor-plans/templates.router.ts
git commit -m "feat(floor-plans): add templates.listBySite for event picker"
```

---

## Task 2: Frontend — the data-adapter hook

**Files:**
- Create: `webapp/src/hooks/useFloorPlanEditorData.ts`

This hook is the single place that knows whether the editor is editing a template or an event layout. It calls both routers' query/mutations (only the active query is `enabled`, so only one fetches), normalizes the parent-id field (`templateId` vs `layoutId`), and exposes a uniform interface. Side effects (local state, toasts) stay in the editor and are passed in via `callbacks`.

- [ ] **Step 1: Create the hook file**

Create `webapp/src/hooks/useFloorPlanEditorData.ts` with exactly:

```ts
import { useCallback, useMemo } from 'react'
import { trpc } from '@/utils/trpc'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type RouterInput = inferRouterInputs<AppRouter>

type TemplateGet = NonNullable<RouterOutput['floorPlans']['templates']['get']>

// Templates and event layouts are intentionally mirrored on the backend. The
// only structural difference between their component rows is the parent-id
// field (templateId vs layoutId), which the editor never reads. We therefore
// expose a single normalized shape, based on the template type, so the editor
// stays source-agnostic. The `as unknown as` casts below are confined to this
// boundary on purpose.
export type FloorPlanEditorComponent = Omit<TemplateGet['components'][number], 'templateId'>
export type FloorPlanEditorData = Omit<TemplateGet, 'components'> & {
  components: FloorPlanEditorComponent[]
}

export type Source =
  | { kind: 'template'; id: string }
  | { kind: 'eventLayout'; id: string }

type AddComponentArgs = Omit<RouterInput['floorPlans']['templates']['addComponent'], 'templateId'>
type UpdateComponentArgs = RouterInput['floorPlans']['templates']['updateComponent']
type BulkComponents = RouterInput['floorPlans']['templates']['bulkUpdateComponents']['components']

export interface FloorPlanEditorCallbacks {
  onComponentAdded: (component: FloorPlanEditorComponent) => void
  onComponentUpdated: () => void
  onComponentDeleted: (id: string) => void
  onBulkUpdated: () => void
  onError: (op: 'add' | 'update' | 'delete' | 'bulk', message: string) => void
}

export function useFloorPlanEditorData({
  source,
  callbacks,
}: {
  source: Source
  callbacks: FloorPlanEditorCallbacks
}) {
  const isTemplate = source.kind === 'template'

  // Only the active source actually fetches; the other query is disabled.
  const tplQuery = trpc.floorPlans.templates.get.useQuery(
    { id: source.id },
    { enabled: isTemplate }
  )
  const layoutQuery = trpc.floorPlans.eventLayouts.get.useQuery(
    { id: source.id },
    { enabled: !isTemplate }
  )

  // --- add ---
  const tplAdd = trpc.floorPlans.templates.addComponent.useMutation({
    onSuccess: (c) => callbacks.onComponentAdded(c as unknown as FloorPlanEditorComponent),
    onError: (e) => callbacks.onError('add', e.message),
  })
  const layoutAdd = trpc.floorPlans.eventLayouts.addComponent.useMutation({
    onSuccess: (c) => callbacks.onComponentAdded(c as unknown as FloorPlanEditorComponent),
    onError: (e) => callbacks.onError('add', e.message),
  })

  // --- update (loud: closes edit dialog, shows success toast) ---
  const tplUpdate = trpc.floorPlans.templates.updateComponent.useMutation({
    onSuccess: () => callbacks.onComponentUpdated(),
    onError: (e) => callbacks.onError('update', e.message),
  })
  const layoutUpdate = trpc.floorPlans.eventLayouts.updateComponent.useMutation({
    onSuccess: () => callbacks.onComponentUpdated(),
    onError: (e) => callbacks.onError('update', e.message),
  })

  // --- update (silent: inline rotate / drag-persist; only surfaces errors) ---
  const tplUpdateSilent = trpc.floorPlans.templates.updateComponent.useMutation({
    onError: (e) => callbacks.onError('update', e.message),
  })
  const layoutUpdateSilent = trpc.floorPlans.eventLayouts.updateComponent.useMutation({
    onError: (e) => callbacks.onError('update', e.message),
  })

  // --- delete ---
  const tplDelete = trpc.floorPlans.templates.deleteComponent.useMutation({
    onSuccess: (_d, variables) => callbacks.onComponentDeleted(variables.id),
    onError: (e) => callbacks.onError('delete', e.message),
  })
  const layoutDelete = trpc.floorPlans.eventLayouts.deleteComponent.useMutation({
    onSuccess: (_d, variables) => callbacks.onComponentDeleted(variables.id),
    onError: (e) => callbacks.onError('delete', e.message),
  })

  // --- bulk update ---
  const tplBulk = trpc.floorPlans.templates.bulkUpdateComponents.useMutation({
    onSuccess: () => callbacks.onBulkUpdated(),
    onError: (e) => callbacks.onError('bulk', e.message),
  })
  const layoutBulk = trpc.floorPlans.eventLayouts.bulkUpdateComponents.useMutation({
    onSuccess: () => callbacks.onBulkUpdated(),
    onError: (e) => callbacks.onError('bulk', e.message),
  })

  const addComponent = useCallback((args: AddComponentArgs) => {
    if (isTemplate) tplAdd.mutate({ ...args, templateId: source.id })
    else layoutAdd.mutate({ ...args, layoutId: source.id })
  }, [isTemplate, source.id, tplAdd, layoutAdd])

  const updateComponent = useCallback((args: UpdateComponentArgs) => {
    if (isTemplate) tplUpdate.mutate(args)
    else layoutUpdate.mutate(args)
  }, [isTemplate, tplUpdate, layoutUpdate])

  const updateComponentSilent = useCallback((args: UpdateComponentArgs) => {
    if (isTemplate) tplUpdateSilent.mutate(args)
    else layoutUpdateSilent.mutate(args)
  }, [isTemplate, tplUpdateSilent, layoutUpdateSilent])

  const deleteComponent = useCallback((args: { id: string }) => {
    if (isTemplate) tplDelete.mutate(args)
    else layoutDelete.mutate(args)
  }, [isTemplate, tplDelete, layoutDelete])

  const bulkUpdate = useCallback((components: BulkComponents) => {
    if (isTemplate) tplBulk.mutate({ templateId: source.id, components })
    else layoutBulk.mutate({ layoutId: source.id, components })
  }, [isTemplate, source.id, tplBulk, layoutBulk])

  const rawData = isTemplate ? tplQuery.data : layoutQuery.data
  const data = rawData as unknown as FloorPlanEditorData | null | undefined
  const isLoading = isTemplate ? tplQuery.isLoading : layoutQuery.isLoading
  const bulkUpdatePending = isTemplate ? tplBulk.isPending : layoutBulk.isPending
  const updateComponentPending = isTemplate ? tplUpdate.isPending : layoutUpdate.isPending

  return useMemo(
    () => ({
      data,
      isLoading,
      addComponent,
      updateComponent,
      updateComponentSilent,
      deleteComponent,
      bulkUpdate,
      bulkUpdatePending,
      updateComponentPending,
    }),
    [
      data,
      isLoading,
      addComponent,
      updateComponent,
      updateComponentSilent,
      deleteComponent,
      bulkUpdate,
      bulkUpdatePending,
      updateComponentPending,
    ]
  )
}
```

- [ ] **Step 2: Type-check the webapp**

Run: `cd webapp && npm run tsc`
Expected: no **new** errors (the file is exported but not yet consumed; the pre-existing `VoiceAssistant.tsx` errors may still appear and are ignored).

If TS complains that the `BulkComponents` array isn't assignable to the eventLayouts bulk input, that means the two routers' bulk component-item schemas have drifted; inspect both and align the type. Per current code (`templates.router.ts` and `event-layouts.router.ts` lines 509-520) they are identical, so this should not happen.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/hooks/useFloorPlanEditorData.ts
git commit -m "feat(floor-plans): add useFloorPlanEditorData adapter hook"
```

---

## Task 3: Refactor `TemplateEditor` → `FloorPlanEditor`

**Files:**
- Rename + modify: `webapp/src/pages/floor-plans/TemplateEditor.tsx` → `webapp/src/pages/floor-plans/FloorPlanEditor.tsx`

This is the largest task. The canvas/gesture/snap/render logic is **unchanged**; only the data-access wiring and the component signature change. Do the edits in order, then type-check once at the end.

- [ ] **Step 1: Rename the file (preserve git history)**

```bash
git mv webapp/src/pages/floor-plans/TemplateEditor.tsx webapp/src/pages/floor-plans/FloorPlanEditor.tsx
```

- [ ] **Step 2: Update the import on line 2 (drop `useParams`)**

Old:
```ts
import { useParams, useNavigate } from 'react-router-dom'
```
New:
```ts
import { useNavigate } from 'react-router-dom'
```

- [ ] **Step 3: Replace the type block (lines 33-43) and add the hook import**

Old:
```ts
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type Template = RouterOutput['floorPlans']['templates']['get']
type TemplateComponent = Template['components'][0]
type ComponentType = RouterOutput['floorPlans']['componentTypes']['list'][0]

type PlacedComponent = TemplateComponent & {
  isDragging?: boolean
}
```
New:
```ts
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../../server/src/routers/appRouter'
import {
  useFloorPlanEditorData,
  type Source,
  type FloorPlanEditorData,
  type FloorPlanEditorComponent,
} from '@/hooks/useFloorPlanEditorData'

type RouterOutput = inferRouterOutputs<AppRouter>
type ComponentType = RouterOutput['floorPlans']['componentTypes']['list'][0]

type PlacedComponent = FloorPlanEditorComponent & {
  isDragging?: boolean
}
```

- [ ] **Step 4: Change the component signature (lines 58-59)**

Old:
```ts
export function TemplateEditor() {
  const { templateId } = useParams<{ templateId: string }>()
```
New:
```ts
interface FloorPlanEditorProps {
  source: Source
  getBackHref: (data: FloorPlanEditorData) => string
}

export function FloorPlanEditor({ source, getBackHref }: FloorPlanEditorProps) {
```

- [ ] **Step 5: Replace the data + mutations block with the hook (lines 93-161)**

Replace everything from `const utils = trpc.useUtils()` (line 93) through the end of the `updateComponentSilent` mutation (line 161) with the following. The `componentTypes` query (lines 102-105) and signed-URL hook (lines 108-110) are **rewritten here** so keep them in this new block:

Old (lines 93-161, the whole region containing `utils`, the `template` query, `componentTypes` query, `imageUrl`, and all five mutations):
```ts
  const utils = trpc.useUtils()

  // Fetch template data
  const { data: template, isLoading: isLoadingTemplate } = trpc.floorPlans.templates.get.useQuery(
    { id: templateId! },
    { enabled: !!templateId }
  )

  // Fetch component types for the sidebar
  const { data: componentTypes } = trpc.floorPlans.componentTypes.list.useQuery(
    { organizationId: currentOrg?.id || '' },
    { enabled: !!currentOrg?.id }
  )

  // Get signed URL for floor plan image
  const { signedUrl: imageUrl } = useSignedUrl({
    fileId: template?.floorPlan?.imageFile?.id,
  })

  // Mutations
  const addComponentMutation = trpc.floorPlans.templates.addComponent.useMutation({
    onSuccess: (newComponent) => {
      setLocalComponents(prev => [...prev, newComponent])
      setSelectedComponentId(newComponent.id)
      toast.success(t('templateEditor.componentAdded'))
    },
    onError: (error) => {
      toast.error(t('templateEditor.componentAddError'), { description: error.message })
    },
  })

  const updateComponentMutation = trpc.floorPlans.templates.updateComponent.useMutation({
    onSuccess: () => {
      toast.success(t('templateEditor.componentUpdated'))
      setEditDialogOpen(false)
      setEditingComponent(null)
    },
    onError: (error) => {
      toast.error(t('templateEditor.componentUpdateError'), { description: error.message })
    },
  })

  const deleteComponentMutation = trpc.floorPlans.templates.deleteComponent.useMutation({
    onSuccess: () => {
      setLocalComponents(prev => prev.filter(c => c.id !== selectedComponentId))
      setSelectedComponentId(null)
      toast.success(t('templateEditor.componentDeleted'))
    },
    onError: (error) => {
      toast.error(t('templateEditor.componentDeleteError'), { description: error.message })
    },
  })

  const bulkUpdateMutation = trpc.floorPlans.templates.bulkUpdateComponents.useMutation({
    onSuccess: () => {
      setHasUnsavedChanges(false)
    },
    onError: (error) => {
      toast.error(t('templateEditor.saveError'), { description: error.message })
    },
  })

  // Silent variant for inline edits (rotate buttons, drag-persist): no success
  // toast and no edit-dialog side effects — only surfaces errors.
  const updateComponentSilent = trpc.floorPlans.templates.updateComponent.useMutation({
    onError: (error) => {
      toast.error(t('templateEditor.componentUpdateError'), { description: error.message })
    },
  })
```
New:
```ts
  // Data + mutations, abstracted over template vs event-layout source.
  const editor = useFloorPlanEditorData({
    source,
    callbacks: {
      onComponentAdded: (component) => {
        setLocalComponents(prev => [...prev, component])
        setSelectedComponentId(component.id)
        toast.success(t('templateEditor.componentAdded'))
      },
      onComponentUpdated: () => {
        toast.success(t('templateEditor.componentUpdated'))
        setEditDialogOpen(false)
        setEditingComponent(null)
      },
      onComponentDeleted: (id) => {
        setLocalComponents(prev => prev.filter(c => c.id !== id))
        setSelectedComponentId(prev => (prev === id ? null : prev))
        toast.success(t('templateEditor.componentDeleted'))
      },
      onBulkUpdated: () => {
        setHasUnsavedChanges(false)
      },
      onError: (op, message) => {
        const msg =
          op === 'add' ? t('templateEditor.componentAddError') :
          op === 'delete' ? t('templateEditor.componentDeleteError') :
          op === 'bulk' ? t('templateEditor.saveError') :
          t('templateEditor.componentUpdateError')
        toast.error(msg, { description: message })
      },
    },
  })
  const { data, isLoading } = editor

  // Fetch component types for the sidebar
  const { data: componentTypes } = trpc.floorPlans.componentTypes.list.useQuery(
    { organizationId: currentOrg?.id || '' },
    { enabled: !!currentOrg?.id }
  )

  // Get signed URL for floor plan image
  const { signedUrl: imageUrl } = useSignedUrl({
    fileId: data?.floorPlan?.imageFile?.id,
  })
```

- [ ] **Step 6: Update the init-from-data effect (lines 164-168)**

Old:
```ts
  // Initialize local components from template
  useEffect(() => {
    if (template?.components) {
      setLocalComponents(template.components)
    }
  }, [template?.components])
```
New:
```ts
  // Initialize local components from the loaded source
  useEffect(() => {
    if (data?.components) {
      setLocalComponents(data.components)
    }
  }, [data?.components])
```

- [ ] **Step 7: Update the Delete-key handler (line 174)**

Old:
```ts
        deleteComponentMutation.mutate({ id: selectedComponentId })
```
New:
```ts
        editor.deleteComponent({ id: selectedComponentId })
```

- [ ] **Step 8: Update `pixelsToMeters` / `metersToPixels` (lines 211-223)**

Replace the two `template?.floorPlan?.pixelsPerMeter` reads and the two `template.floorPlan.pixelsPerMeter` reads with `data`. Old:
```ts
  const pixelsToMeters = useCallback((pixels: number) => {
    if (!template?.floorPlan?.pixelsPerMeter) return pixels / 100
    // Divide by dpiScale to convert from displayed pixels to natural pixels
    return (pixels / dpiScale) / template.floorPlan.pixelsPerMeter
  }, [template?.floorPlan?.pixelsPerMeter, dpiScale])

  // Convert meters to pixels (accounting for DPI scaling)
  // Output is in "displayed" space
  const metersToPixels = useCallback((meters: number) => {
    if (!template?.floorPlan?.pixelsPerMeter) return meters * 100
    // Scale down by DPI factor so components match the displayed image size
    return meters * template.floorPlan.pixelsPerMeter * dpiScale
  }, [template?.floorPlan?.pixelsPerMeter, dpiScale])
```
New:
```ts
  const pixelsToMeters = useCallback((pixels: number) => {
    if (!data?.floorPlan?.pixelsPerMeter) return pixels / 100
    // Divide by dpiScale to convert from displayed pixels to natural pixels
    return (pixels / dpiScale) / data.floorPlan.pixelsPerMeter
  }, [data?.floorPlan?.pixelsPerMeter, dpiScale])

  // Convert meters to pixels (accounting for DPI scaling)
  // Output is in "displayed" space
  const metersToPixels = useCallback((meters: number) => {
    if (!data?.floorPlan?.pixelsPerMeter) return meters * 100
    // Scale down by DPI factor so components match the displayed image size
    return meters * data.floorPlan.pixelsPerMeter * dpiScale
  }, [data?.floorPlan?.pixelsPerMeter, dpiScale])
```

- [ ] **Step 9: Update `addComponentAtViewCenter` (lines 288-306)**

Old:
```ts
  const addComponentAtViewCenter = useCallback((componentType: ComponentType) => {
    if (!templateId || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const screenCenterX = rect.width / 2
    const screenCenterY = rect.height / 2
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
  }, [templateId, pan, zoom, localComponents, pixelsToMeters, addComponentMutation])
```
New:
```ts
  const addComponentAtViewCenter = useCallback((componentType: ComponentType) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const screenCenterX = rect.width / 2
    const screenCenterY = rect.height / 2
    const canvasX = (screenCenterX - pan.x) / zoom
    const canvasY = (screenCenterY - pan.y) / zoom
    const cascade = (localComponents.length % 6) * 12 // px, in canvas space
    const xInMeters = pixelsToMeters(canvasX + cascade)
    const yInMeters = pixelsToMeters(canvasY + cascade)
    editor.addComponent({
      componentTypeId: componentType.id,
      xInMeters,
      yInMeters,
      widthInMeters: componentType.defaultWidthInMeters,
      heightInMeters: componentType.defaultHeightInMeters,
    })
  }, [pan, zoom, localComponents, pixelsToMeters, editor])
```

- [ ] **Step 10: Update the drag-persist in `bindComponent` onDragEnd (line 603)**

Old:
```ts
          bulkUpdateMutation.mutate({ templateId: templateId!, components: [{ id, xInMeters: pos.xInMeters, yInMeters: pos.yInMeters }] })
```
New:
```ts
          editor.bulkUpdate([{ id, xInMeters: pos.xInMeters, yInMeters: pos.yInMeters }])
```

- [ ] **Step 11: Update rotation auto-save in `handleRotateEnd` (lines 698-705)**

Old:
```ts
        bulkUpdateMutation.mutate({
          templateId: templateId!,
          components: [{
            id: componentId,
            rotation: finalRotation,
          }],
        })
```
New:
```ts
        editor.bulkUpdate([{
          id: componentId,
          rotation: finalRotation,
        }])
```

- [ ] **Step 12: Update `handleSave` (lines 713-729)**

Old:
```ts
  const handleSave = () => {
    if (!templateId) return

    const updates = localComponents.map(c => ({
      id: c.id,
      xInMeters: c.xInMeters,
      yInMeters: c.yInMeters,
      widthInMeters: c.widthInMeters,
      heightInMeters: c.heightInMeters,
      rotation: c.rotation,
    }))

    bulkUpdateMutation.mutate({
      templateId,
      components: updates,
    })
  }
```
New:
```ts
  const handleSave = () => {
    const updates = localComponents.map(c => ({
      id: c.id,
      xInMeters: c.xInMeters,
      yInMeters: c.yInMeters,
      widthInMeters: c.widthInMeters,
      heightInMeters: c.heightInMeters,
      rotation: c.rotation,
    }))

    editor.bulkUpdate(updates)
  }
```

- [ ] **Step 13: Update `handleSaveEdit` (line 745)**

Old:
```ts
    updateComponentMutation.mutate({
      id: editingComponent.id,
      label: editForm.label || null,
      rotation: parseFloat(editForm.rotation) || 0,
    })
```
New:
```ts
    editor.updateComponent({
      id: editingComponent.id,
      label: editForm.label || null,
      rotation: parseFloat(editForm.rotation) || 0,
    })
```

- [ ] **Step 14: Update `rotateComponent` (line 765)**

Old:
```ts
    updateComponentSilent.mutate({ id, rotation })
```
New:
```ts
    editor.updateComponentSilent({ id, rotation })
```

- [ ] **Step 15: Update the loading + not-found guards (lines 768-782)**

Old:
```ts
  if (isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">{t('templateEditor.notFound')}</p>
      </div>
    )
  }
```
New:
```ts
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">{t('templateEditor.notFound')}</p>
      </div>
    )
  }
```

- [ ] **Step 16: Update the header back button + title (lines 789-799)**

Old:
```ts
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/floor-plans/${template.floorPlanId}`)}
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <h1 className="font-semibold">{template.name}</h1>
            <p className="text-sm text-muted-foreground">{template.floorPlan?.name}</p>
          </div>
```
New:
```ts
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(getBackHref(data))}
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <h1 className="font-semibold">{data.name}</h1>
            <p className="text-sm text-muted-foreground">{data.floorPlan?.name}</p>
          </div>
```

- [ ] **Step 17: Update the Save button pending state (lines 822-824)**

Old:
```ts
            disabled={!hasUnsavedChanges || bulkUpdateMutation.isPending}
          >
            {bulkUpdateMutation.isPending ? (
```
New:
```ts
            disabled={!hasUnsavedChanges || editor.bulkUpdatePending}
          >
            {editor.bulkUpdatePending ? (
```

- [ ] **Step 18: Update the image `alt` (line 864)**

Old:
```ts
                alt={template.floorPlan?.name}
```
New:
```ts
                alt={data.floorPlan?.name}
```

- [ ] **Step 19: Update the two desktop+mobile delete calls (lines 1055 and 1085)**

There are two identical occurrences:
Old:
```ts
            onDelete={() => selectedComponentId && deleteComponentMutation.mutate({ id: selectedComponentId })}
```
New:
```ts
            onDelete={() => selectedComponentId && editor.deleteComponent({ id: selectedComponentId })}
```

And:
Old:
```ts
            onDelete={() => deleteComponentMutation.mutate({ id: selectedComponentId })}
```
New:
```ts
            onDelete={() => editor.deleteComponent({ id: selectedComponentId })}
```

- [ ] **Step 20: Update the edit-dialog Save pending state (lines 1130-1131)**

Old:
```ts
            <Button onClick={handleSaveEdit} disabled={updateComponentMutation.isPending}>
              {updateComponentMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
```
New:
```ts
            <Button onClick={handleSaveEdit} disabled={editor.updateComponentPending}>
              {editor.updateComponentPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
```

- [ ] **Step 21: Type-check the webapp**

Run: `cd webapp && npm run tsc`
Expected: no **new** errors. (`App.tsx` will now error because it still imports `TemplateEditor` from this file — that's fixed in Task 4. If you want a clean check in isolation, proceed to Task 4 before type-checking, or temporarily accept the single `App.tsx` import error.)

Note: there is intentionally **no remaining reference** to `template`, `templateId`, `isLoadingTemplate`, `utils`, `addComponentMutation`, `updateComponentMutation`, `deleteComponentMutation`, `bulkUpdateMutation`, or `updateComponentSilent` in the file. Grep to confirm:

```bash
grep -nE "templateId|isLoadingTemplate|addComponentMutation|updateComponentMutation|deleteComponentMutation|bulkUpdateMutation|updateComponentSilent|trpc.useUtils|\btemplate\b" webapp/src/pages/floor-plans/FloorPlanEditor.tsx
```
Expected: no matches (other than inside translation keys like `templateEditor.*`, which are fine).

- [ ] **Step 22: Commit**

```bash
git add webapp/src/pages/floor-plans/FloorPlanEditor.tsx
git commit -m "refactor(floor-plans): generalize TemplateEditor into FloorPlanEditor via adapter hook"
```

---

## Task 4: Route wrappers + App routing

**Files:**
- Create: `webapp/src/pages/floor-plans/TemplateEditorRoute.tsx`
- Create: `webapp/src/pages/floor-plans/EventLayoutEditorRoute.tsx`
- Modify: `webapp/src/App.tsx`

- [ ] **Step 1: Create the template route wrapper**

Create `webapp/src/pages/floor-plans/TemplateEditorRoute.tsx`:

```tsx
import { useParams } from 'react-router-dom'
import { FloorPlanEditor } from './FloorPlanEditor'

export function TemplateEditorRoute() {
  const { templateId } = useParams<{ templateId: string }>()
  if (!templateId) return null
  return (
    <FloorPlanEditor
      source={{ kind: 'template', id: templateId }}
      getBackHref={(data) => `/floor-plans/${data.floorPlanId}`}
    />
  )
}
```

- [ ] **Step 2: Create the event-layout route wrapper**

Create `webapp/src/pages/floor-plans/EventLayoutEditorRoute.tsx`:

```tsx
import { useParams } from 'react-router-dom'
import { FloorPlanEditor } from './FloorPlanEditor'

export function EventLayoutEditorRoute() {
  const { eventId, layoutId } = useParams<{ eventId: string; layoutId: string }>()
  if (!eventId || !layoutId) return null
  return (
    <FloorPlanEditor
      source={{ kind: 'eventLayout', id: layoutId }}
      getBackHref={() => `/event/${eventId}?tab=floor-plan`}
    />
  )
}
```

- [ ] **Step 3: Update `App.tsx` imports (line 23)**

Old:
```tsx
import { TemplateEditor } from '@/pages/floor-plans/TemplateEditor'
```
New:
```tsx
import { TemplateEditorRoute } from '@/pages/floor-plans/TemplateEditorRoute'
import { EventLayoutEditorRoute } from '@/pages/floor-plans/EventLayoutEditorRoute'
```

- [ ] **Step 4: Update the routes in `App.tsx` (line 56)**

Old:
```tsx
            <Route path="/templates/:templateId" element={<TemplateEditor />} />
```
New:
```tsx
            <Route path="/templates/:templateId" element={<TemplateEditorRoute />} />
            <Route path="/event/:eventId/floor-plan/:layoutId" element={<EventLayoutEditorRoute />} />
```

- [ ] **Step 5: Type-check the webapp**

Run: `cd webapp && npm run tsc`
Expected: no new errors. The `App.tsx` import error from Task 3 is now resolved.

- [ ] **Step 6: Manual check — template editor still works**

With the dev server running, open an existing template at `/templates/:templateId`. Confirm: image loads, components render, drag/move/rotate/add/delete all still work and persist, the back button returns to the floor-plan detail page. (This proves the refactor is behavior-preserving.)

- [ ] **Step 7: Commit**

```bash
git add webapp/src/pages/floor-plans/TemplateEditorRoute.tsx webapp/src/pages/floor-plans/EventLayoutEditorRoute.tsx webapp/src/App.tsx
git commit -m "feat(floor-plans): wire template + event-layout editor routes"
```

---

## Task 5: i18n keys

**Files:**
- Modify: `webapp/src/locales/en/translation.ts`
- Modify: `webapp/src/locales/he/translation.ts`
- Modify: `webapp/src/locales/ar/translation.ts`

The `t()` function is type-safe and inferred from the English file, so the keys must exist before the components in Task 6 reference them. English first.

- [ ] **Step 1: Add the `eventFloorPlan` section to English**

In `webapp/src/locales/en/translation.ts`, add a new top-level section to the exported translation object (place it next to the existing `floorPlans` section; ensure a trailing comma after the previous section and valid object syntax):

```ts
  eventFloorPlan: {
    tab: 'Floor Plan',
    empty: 'No floor plan yet',
    emptyDescription: 'Add a floor plan layout for this event, copied from a template.',
    add: 'Add floor plan',
    pickerTitle: 'Choose a template',
    noTemplates: 'No templates available. Create a floor plan and template for this site first.',
    open: 'Open',
    remove: 'Remove',
    items_one: '{{count}} item',
    items_other: '{{count}} items',
    removeTitle: 'Remove floor plan?',
    removeDescription: "This deletes this event's floor plan layout. The original template is not affected.",
    created: 'Floor plan added',
    createError: 'Failed to add floor plan',
    removed: 'Floor plan removed',
    removeError: 'Failed to remove floor plan',
  },
```

- [ ] **Step 2: Add the same section to Hebrew**

In `webapp/src/locales/he/translation.ts`, add:

```ts
  eventFloorPlan: {
    tab: 'תרשים',
    empty: 'אין עדיין תרשים',
    emptyDescription: 'הוסף פריסת תרשים לאירוע זה, מועתקת מתבנית.',
    add: 'הוסף תרשים',
    pickerTitle: 'בחר תבנית',
    noTemplates: 'אין תבניות זמינות. צור תחילה תרשים ותבנית לאתר זה.',
    open: 'פתח',
    remove: 'הסר',
    items_one: 'פריט אחד',
    items_other: '{{count}} פריטים',
    removeTitle: 'להסיר את התרשים?',
    removeDescription: 'פעולה זו מוחקת את פריסת התרשים של האירוע. התבנית המקורית אינה מושפעת.',
    created: 'התרשים נוסף',
    createError: 'הוספת התרשים נכשלה',
    removed: 'התרשים הוסר',
    removeError: 'הסרת התרשים נכשלה',
  },
```

- [ ] **Step 3: Add the same section to Arabic**

In `webapp/src/locales/ar/translation.ts`, add:

```ts
  eventFloorPlan: {
    tab: 'المخطط',
    empty: 'لا يوجد مخطط بعد',
    emptyDescription: 'أضف مخطط أرضية لهذا الحدث، منسوخًا من قالب.',
    add: 'إضافة مخطط',
    pickerTitle: 'اختر قالبًا',
    noTemplates: 'لا توجد قوالب متاحة. أنشئ مخطط أرضية وقالبًا لهذا الموقع أولًا.',
    open: 'فتح',
    remove: 'إزالة',
    items_one: 'عنصر واحد',
    items_other: '{{count}} عناصر',
    removeTitle: 'إزالة المخطط؟',
    removeDescription: 'هذا يحذف مخطط الأرضية لهذا الحدث. القالب الأصلي لا يتأثر.',
    created: 'تمت إضافة المخطط',
    createError: 'فشلت إضافة المخطط',
    removed: 'تمت إزالة المخطط',
    removeError: 'فشلت إزالة المخطط',
  },
```

- [ ] **Step 4: Type-check the webapp**

Run: `cd webapp && npm run tsc`
Expected: no new errors. If the English and other files' object shapes diverge (a missing/extra key), tsc will flag it — align them.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/locales/en/translation.ts webapp/src/locales/he/translation.ts webapp/src/locales/ar/translation.ts
git commit -m "i18n(floor-plans): add eventFloorPlan keys (en/he/ar)"
```

---

## Task 6: Event floor-plan picker + tab components

**Files:**
- Create: `webapp/src/components/event-tabs/EventFloorPlanPicker.tsx`
- Create: `webapp/src/components/event-tabs/EventFloorPlanTab.tsx`

- [ ] **Step 1: Create the picker**

Create `webapp/src/components/event-tabs/EventFloorPlanPicker.tsx`:

```tsx
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { toast } from 'sonner'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronRight } from 'lucide-react'

interface EventFloorPlanPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  siteId: string
}

export function EventFloorPlanPicker({ open, onOpenChange, eventId, siteId }: EventFloorPlanPickerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const { data: templates, isLoading } = trpc.floorPlans.templates.listBySite.useQuery(
    { siteId },
    { enabled: open && !!siteId }
  )

  const createMutation = trpc.floorPlans.eventLayouts.createFromTemplate.useMutation({
    onSuccess: (layout) => {
      utils.floorPlans.eventLayouts.list.invalidate({ eventId })
      toast.success(t('eventFloorPlan.created'))
      onOpenChange(false)
      navigate(`/event/${eventId}/floor-plan/${layout.id}`)
    },
    onError: (error) => {
      toast.error(t('eventFloorPlan.createError'), { description: error.message })
    },
  })

  // Group templates by floor plan for a labelled-but-flat list.
  const groups = useMemo(() => {
    const byPlan = new Map<string, { name: string; rows: NonNullable<typeof templates> }>()
    for (const tpl of templates ?? []) {
      const key = tpl.floorPlan.id
      if (!byPlan.has(key)) byPlan.set(key, { name: tpl.floorPlan.name, rows: [] })
      byPlan.get(key)!.rows.push(tpl)
    }
    return Array.from(byPlan.values())
  }, [templates])

  const isEmpty = !isLoading && (templates?.length ?? 0) === 0

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader>
          <DrawerTitle>{t('eventFloorPlan.pickerTitle')}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {isEmpty && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('eventFloorPlan.noTemplates')}
            </p>
          )}
          {groups.map((group) => (
            <div key={group.name} className="mb-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-1 px-1">{group.name}</h4>
              <div className="flex flex-col gap-1">
                {group.rows.map((tpl) => (
                  <Button
                    key={tpl.id}
                    variant="outline"
                    className="justify-between h-auto py-3"
                    disabled={createMutation.isPending}
                    onClick={() => createMutation.mutate({ eventId, templateId: tpl.id, name: tpl.name })}
                  >
                    <span>{tpl.name}</span>
                    <ChevronRight className="h-4 w-4 rtl:rotate-180 opacity-50" />
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
```

Note on the `Drawer` import surface: `FloorPlanEditor.tsx` imports `Drawer, DrawerContent, DrawerTitle` from `@/components/ui/drawer`. This component additionally uses `DrawerHeader`. If `DrawerHeader` is not exported by that wrapper, replace the `<DrawerHeader>` block with a plain `<div className="px-4 pt-4 pb-2"><DrawerTitle>...</DrawerTitle></div>`. Verify the export before assuming.

- [ ] **Step 2: Create the tab**

Create `webapp/src/components/event-tabs/EventFloorPlanTab.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, Map, Plus, Trash2 } from 'lucide-react'
import { EventFloorPlanPicker } from './EventFloorPlanPicker'

interface EventFloorPlanTabProps {
  eventId: string
  siteId: string
}

export function EventFloorPlanTab({ eventId, siteId }: EventFloorPlanTabProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)

  const { data: layouts, isLoading } = trpc.floorPlans.eventLayouts.list.useQuery(
    { eventId },
    { enabled: !!eventId }
  )

  // One layout per event (YAGNI): we only ever read/operate on the first.
  const layout = layouts?.[0] ?? null

  const removeMutation = trpc.floorPlans.eventLayouts.delete.useMutation({
    onSuccess: () => {
      utils.floorPlans.eventLayouts.list.invalidate({ eventId })
      toast.success(t('eventFloorPlan.removed'))
      setRemoveOpen(false)
    },
    onError: (error) => {
      toast.error(t('eventFloorPlan.removeError'), { description: error.message })
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!layout) {
    return (
      <div className="px-4">
        <div className="flex flex-col items-center justify-center text-center border border-dashed rounded-lg py-12 gap-3">
          <Map className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">{t('eventFloorPlan.empty')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('eventFloorPlan.emptyDescription')}</p>
          </div>
          <Button onClick={() => setPickerOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t('eventFloorPlan.add')}
          </Button>
        </div>
        <EventFloorPlanPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          eventId={eventId}
          siteId={siteId}
        />
      </div>
    )
  }

  const itemCount = layout.components?.length ?? 0

  return (
    <div className="px-4">
      <div className="flex items-center justify-between border rounded-lg p-4">
        <button
          className="flex items-center gap-3 text-start flex-1"
          onClick={() => navigate(`/event/${eventId}/floor-plan/${layout.id}`)}
        >
          <Map className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">{layout.name}</p>
            <p className="text-sm text-muted-foreground">{t('eventFloorPlan.items', { count: itemCount })}</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate(`/event/${eventId}/floor-plan/${layout.id}`)}>
            {t('eventFloorPlan.open')}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setRemoveOpen(true)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('eventFloorPlan.removeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('eventFloorPlan.removeDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMutation.mutate({ id: layout.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('eventFloorPlan.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

Note: `t('eventFloorPlan.items', { count })` uses i18next plural resolution against the `items_one` / `items_other` keys added in Task 5. If the project's i18next type setup rejects the base key `eventFloorPlan.items` (because only `items_one`/`items_other` literally exist), replace that call with a non-plural key instead: add `items: '{{count}} items'` to all three locale files and keep `t('eventFloorPlan.items', { count: itemCount })`. Verify with tsc.

- [ ] **Step 3: Type-check the webapp**

Run: `cd webapp && npm run tsc`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/components/event-tabs/EventFloorPlanPicker.tsx webapp/src/components/event-tabs/EventFloorPlanTab.tsx
git commit -m "feat(events): add floor-plan picker and tab components"
```

---

## Task 7: Wire the Floor Plan tab into `Event.tsx`

**Files:**
- Modify: `webapp/src/pages/Event.tsx`

Keep only the Details tab; comment out (do not delete) the other six; add the Floor Plan tab and footer button; change the footer grid to 2 columns.

- [ ] **Step 1: Update imports (lines 7, 24-30)**

Add the `Map` icon and the new tab to the icon import (line 7). Old:
```ts
import { Clock, FileText, Package, Briefcase, CheckSquare, DollarSign, FolderOpen, Calendar, User } from 'lucide-react'
```
New:
```ts
import { FileText, Calendar, User, Map } from 'lucide-react'
```

Comment out the six unused tab imports and add the new one (lines 24-30). Old:
```ts
import { EventDetailsTab } from '@/components/event-tabs/EventDetailsTab'
import { EventProductsTab } from '@/components/event-tabs/EventProductsTab'
import { EventServicesTab } from '@/components/event-tabs/EventServicesTab'
import { EventTasksTab } from '@/components/event-tabs/EventTasksTab'
import { EventFinancesTab } from '@/components/event-tabs/EventFinancesTab'
import { EventFilesTab } from '@/components/event-tabs/EventFilesTab'
import { EventWaitingListTab } from '@/components/event-tabs/EventWaitingListTab'
```
New:
```ts
import { EventDetailsTab } from '@/components/event-tabs/EventDetailsTab'
import { EventFloorPlanTab } from '@/components/event-tabs/EventFloorPlanTab'
// Temporarily disabled tabs (only Details + Floor Plan are in use):
// import { EventProductsTab } from '@/components/event-tabs/EventProductsTab'
// import { EventServicesTab } from '@/components/event-tabs/EventServicesTab'
// import { EventTasksTab } from '@/components/event-tabs/EventTasksTab'
// import { EventFinancesTab } from '@/components/event-tabs/EventFinancesTab'
// import { EventFilesTab } from '@/components/event-tabs/EventFilesTab'
// import { EventWaitingListTab } from '@/components/event-tabs/EventWaitingListTab'
```

- [ ] **Step 2: Replace the disabled `TabsContent` blocks and add Floor Plan (lines 183-205)**

Old:
```tsx
            <TabsContent value="products" className="mt-6">
              <EventProductsTab event={event} />
            </TabsContent>

            <TabsContent value="services" className="mt-6">
              <EventServicesTab event={event} />
            </TabsContent>

            <TabsContent value="waiting" className="mt-6">
              <EventWaitingListTab event={event} />
            </TabsContent>

            <TabsContent value="tasks" className="mt-6">
              {eventId && <EventTasksTab eventId={eventId} />}
            </TabsContent>

            <TabsContent value="finances" className="mt-6">
              {eventId && <EventFinancesTab eventId={eventId} />}
            </TabsContent>

            <TabsContent value="files" className="mt-6">
              {eventId && <EventFilesTab eventId={eventId} />}
            </TabsContent>
```
New:
```tsx
            <TabsContent value="floor-plan" className="mt-6">
              {eventId && <EventFloorPlanTab eventId={eventId} siteId={event.siteId} />}
            </TabsContent>

            {/* Temporarily disabled tabs (only Details + Floor Plan are in use):
            <TabsContent value="products" className="mt-6">
              <EventProductsTab event={event} />
            </TabsContent>

            <TabsContent value="services" className="mt-6">
              <EventServicesTab event={event} />
            </TabsContent>

            <TabsContent value="waiting" className="mt-6">
              <EventWaitingListTab event={event} />
            </TabsContent>

            <TabsContent value="tasks" className="mt-6">
              {eventId && <EventTasksTab eventId={eventId} />}
            </TabsContent>

            <TabsContent value="finances" className="mt-6">
              {eventId && <EventFinancesTab eventId={eventId} />}
            </TabsContent>

            <TabsContent value="files" className="mt-6">
              {eventId && <EventFilesTab eventId={eventId} />}
            </TabsContent>
            */}
```

- [ ] **Step 3: Replace the footer nav (lines 213-270)**

Change the grid from `grid-cols-7` to `grid-cols-2`, keep the Details button, replace the other six buttons with the Floor Plan button (comment out the rest). Old:
```tsx
          <div className="grid grid-cols-7 gap-1">
            <Button
              variant={activeTab === 'details' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('details')}
            >
              <FileText className="h-5 w-5" />
              {activeTab === 'details' && <span className="text-xs">{t('events.details')}</span>}
            </Button>
            <Button
              variant={activeTab === 'products' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('products')}
            >
              <Package className="h-5 w-5" />
              {activeTab === 'products' && <span className="text-xs">{t('events.products')}</span>}
            </Button>
            <Button
              variant={activeTab === 'services' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('services')}
            >
              <Briefcase className="h-5 w-5" />
              {activeTab === 'services' && <span className="text-xs">{t('events.services')}</span>}
            </Button>
            <Button
              variant={activeTab === 'tasks' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('tasks')}
            >
              <CheckSquare className="h-5 w-5" />
              {activeTab === 'tasks' && <span className="text-xs">{t('tasks.title')}</span>}
            </Button>
            <Button
              variant={activeTab === 'finances' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('finances')}
            >
              <DollarSign className="h-5 w-5" />
              {activeTab === 'finances' && <span className="text-xs">{t('finances.title')}</span>}
            </Button>
            <Button
              variant={activeTab === 'files' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('files')}
            >
              <FolderOpen className="h-5 w-5" />
              {activeTab === 'files' && <span className="text-xs">{t('files.title')}</span>}
            </Button>
            <Button
              variant={activeTab === 'waiting' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('waiting')}
            >
              <Clock className="h-5 w-5" />
              {activeTab === 'waiting' && <span className="text-xs">{t('waitingList.title')}</span>}
            </Button>
          </div>
```
New:
```tsx
          <div className="grid grid-cols-2 gap-1">
            <Button
              variant={activeTab === 'details' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('details')}
            >
              <FileText className="h-5 w-5" />
              {activeTab === 'details' && <span className="text-xs">{t('events.details')}</span>}
            </Button>
            <Button
              variant={activeTab === 'floor-plan' ? 'default' : 'ghost'}
              className="flex flex-col items-center gap-1 h-auto py-2 rounded-none"
              onClick={() => setActiveTab('floor-plan')}
            >
              <Map className="h-5 w-5" />
              {activeTab === 'floor-plan' && <span className="text-xs">{t('eventFloorPlan.tab')}</span>}
            </Button>
          </div>
```

- [ ] **Step 4: Type-check the webapp**

Run: `cd webapp && npm run tsc`
Expected: no new errors. (Removing the six imports means their symbols are gone; confirm nothing else in the file references `Package`, `Briefcase`, `CheckSquare`, `DollarSign`, `FolderOpen`, `Clock`, or the removed tab components.)

- [ ] **Step 5: Manual walkthrough (the acceptance test)**

With the dev server running and connected to data that has a site with at least one floor plan + template:

1. Open an event → the page shows only **Details** and **Floor Plan** tabs (2-icon footer).
2. Go to **Floor Plan** → empty state with "Add floor plan".
3. Tap **Add floor plan** → picker lists templates grouped by floor plan. (If the site has no templates, the picker shows the "no templates" message.)
4. Tap a template → toast "Floor plan added", navigates to `/event/:eventId/floor-plan/:layoutId`, editor opens with **all components copied** from the template.
5. Move a component → it persists. Open the **source template** separately (`/templates/:id`) → it is **unchanged** (proves copy isolation).
6. Back button → returns to the event's Floor Plan tab, now showing the summary card with the correct item count.
7. **Open** → re-opens the editor. **Remove** → confirm dialog → toast "Floor plan removed" → back to empty state.

- [ ] **Step 6: Commit**

```bash
git add webapp/src/pages/Event.tsx
git commit -m "feat(events): add Floor Plan tab, disable unused tabs"
```

---

## Final verification (after all tasks)

- [ ] `cd server && npm run tsc` — clean.
- [ ] `cd webapp && npm run tsc` — no new errors beyond the known `VoiceAssistant.tsx` ones.
- [ ] Run the Task 7 Step 5 walkthrough end-to-end once more.
- [ ] Confirm the existing template editor (`/templates/:templateId`) is unaffected (Task 4 Step 6).

## Out of Scope (do not implement)

- Multiple layouts per event / multi-space UI.
- Renaming a layout after creation.
- Live canvas thumbnail in the tab.
- Re-syncing a layout when its source template later changes.
- Restoring the six commented-out event tabs.
- Client-side role gating in the new UI — the `eventLayouts` router already enforces `canEdit` / `isAdminOrOwner` server-side, and `Event.tsx` has no client role context to mirror, so errors surface via toast (consistent with the other tabs).
