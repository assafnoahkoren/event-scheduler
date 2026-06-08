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
