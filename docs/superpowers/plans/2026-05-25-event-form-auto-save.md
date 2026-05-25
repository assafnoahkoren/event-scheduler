# EventForm Auto-Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add debounced auto-save (1000ms) to EventForm in update mode, replacing the Save button with a "Saving… / Saved / Failed to save" status indicator.

**Architecture:** All logic lives inside `EventForm.tsx`. A `useEffect` watches field state and fires `onSubmit` after a 1000ms debounce (update mode only). A second `useEffect` tracks the `isSubmitting` prop transition to drive a local `autoSaveStatus` state. The `saveError` boolean prop propagates from `updateMutation.isError` in `Event.tsx` → `EventDetailsTab` → `EventForm`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, tRPC

---

## File Map

| File | Change |
|------|--------|
| `webapp/src/components/EventForm.tsx` | Add `saveError` prop, debounce effect, status state, conditional UI |
| `webapp/src/components/event-tabs/EventDetailsTab.tsx` | Add `isUpdateError` prop, pass to `EventForm` as `saveError` |
| `webapp/src/pages/Event.tsx` | Pass `isUpdateError={updateMutation.isError}` to `EventDetailsTab` |

---

## Task 1: Thread `saveError` prop from Event.tsx down to EventForm

**Files:**
- Modify: `webapp/src/components/EventForm.tsx` (props interface only)
- Modify: `webapp/src/components/event-tabs/EventDetailsTab.tsx`
- Modify: `webapp/src/pages/Event.tsx`

- [ ] **Step 1: Add `saveError` to `EventFormProps` in EventForm.tsx**

In `webapp/src/components/EventForm.tsx`, update the `EventFormProps` interface:

```typescript
interface EventFormProps {
  event?: Event | null
  initialDate?: Date
  initialClientId?: string | null
  onSubmit: (data: EventFormData) => void
  onCancel?: () => void
  isSubmitting?: boolean
  saveError?: boolean
}
```

Also destructure it in the function signature:

```typescript
export function EventForm({
  event,
  initialDate,
  initialClientId,
  onSubmit,
  onCancel,
  isSubmitting = false,
  saveError = false
}: EventFormProps) {
```

- [ ] **Step 2: Add `isUpdateError` prop to `EventDetailsTabProps`**

In `webapp/src/components/event-tabs/EventDetailsTab.tsx`, update the interface:

```typescript
interface EventDetailsTabProps {
  eventId: string
  event: any
  onUpdate: (formData: EventFormData) => void
  onDeleteClick: () => void
  isUpdating: boolean
  isDeleting: boolean
  isUpdateError?: boolean
}
```

Also destructure it:

```typescript
export function EventDetailsTab({
  eventId,
  event,
  onUpdate,
  onDeleteClick,
  isUpdating,
  isDeleting,
  isUpdateError = false,
}: EventDetailsTabProps) {
```

- [ ] **Step 3: Pass `saveError` from EventDetailsTab to EventForm**

In `webapp/src/components/event-tabs/EventDetailsTab.tsx`, update the `EventForm` usage:

```tsx
<EventForm
  event={event}
  onSubmit={onUpdate}
  isSubmitting={isUpdating}
  saveError={isUpdateError}
/>
```

- [ ] **Step 4: Pass `isUpdateError` from Event.tsx to EventDetailsTab**

In `webapp/src/pages/Event.tsx`, update the `EventDetailsTab` usage:

```tsx
<EventDetailsTab
  eventId={eventId}
  event={event}
  onUpdate={handleUpdate}
  onDeleteClick={() => setShowDeleteDialog(true)}
  isUpdating={updateMutation.isPending}
  isDeleting={deleteMutation.isPending}
  isUpdateError={updateMutation.isError}
/>
```

- [ ] **Step 5: Type-check**

```bash
cd webapp && npm run tsc
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add webapp/src/components/EventForm.tsx webapp/src/components/event-tabs/EventDetailsTab.tsx webapp/src/pages/Event.tsx
git commit -m "feat: thread saveError prop from Event.tsx to EventForm"
```

---

## Task 2: Add auto-save status state and isSubmitting watcher

**Files:**
- Modify: `webapp/src/components/EventForm.tsx`

- [ ] **Step 1: Add `autoSaveStatus` state and `wasSubmitting` ref**

Inside `EventForm`, just after the existing `useState` declarations, add:

```typescript
type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'
const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle')
const wasSubmitting = useRef(false)
```

- [ ] **Step 2: Add `useEffect` to track `isSubmitting` transitions**

Add this effect after the existing `useEffect` blocks (after the auto-resize effect):

```typescript
useEffect(() => {
  if (!event) return

  if (isSubmitting) {
    wasSubmitting.current = true
    setAutoSaveStatus('saving')
  } else if (wasSubmitting.current) {
    wasSubmitting.current = false
    if (saveError) {
      setAutoSaveStatus('error')
    } else {
      setAutoSaveStatus('saved')
      const timer = setTimeout(() => setAutoSaveStatus('idle'), 2000)
      return () => clearTimeout(timer)
    }
  }
}, [isSubmitting, saveError, event])
```

- [ ] **Step 3: Type-check**

```bash
cd webapp && npm run tsc
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/components/EventForm.tsx
git commit -m "feat: add autoSaveStatus state and isSubmitting tracker to EventForm"
```

---

## Task 3: Add debounced auto-save effect

**Files:**
- Modify: `webapp/src/components/EventForm.tsx`

- [ ] **Step 1: Add debounce refs**

After the `wasSubmitting` ref from Task 2, add:

```typescript
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const isFirstRender = useRef(true)
```

- [ ] **Step 2: Add the debounce `useEffect`**

Add this effect after the `isSubmitting` watcher from Task 2:

```typescript
useEffect(() => {
  if (!event) return

  if (isFirstRender.current) {
    isFirstRender.current = false
    return
  }

  if (debounceRef.current) clearTimeout(debounceRef.current)
  if (!isValid) return

  debounceRef.current = setTimeout(() => {
    onSubmit({
      type,
      title: title.trim(),
      nickname: nickname.trim() || undefined,
      description: description.trim() || undefined,
      startDate,
      endDate,
      isAllDay,
      clientId,
      status,
    })
  }, 1000)

  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }
}, [type, title, nickname, description, startDate, endDate, isAllDay, clientId, status]) // eslint-disable-line react-hooks/exhaustive-deps
```

The `eslint-disable` comment is intentional: `event`, `onSubmit`, and `isValid` are intentionally excluded to avoid re-triggering the debounce on parent re-renders. The debounce only needs to fire on field changes. `onSubmit` is captured via closure and always reflects the current handler.

- [ ] **Step 3: Type-check**

```bash
cd webapp && npm run tsc
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/components/EventForm.tsx
git commit -m "feat: add debounced auto-save effect to EventForm"
```

---

## Task 4: Update the actions row UI

**Files:**
- Modify: `webapp/src/components/EventForm.tsx`

- [ ] **Step 1: Replace the actions row with conditional rendering**

Find the actions row block in `EventForm.tsx` (currently lines 273–291):

```tsx
{/* Actions */}
<div className="flex justify-end gap-2">
  {onCancel && (
    <Button
      type="button"
      variant="outline"
      onClick={onCancel}
      disabled={isSubmitting}
    >
      {t('common.cancel')}
    </Button>
  )}
  <Button
    type="submit"
    disabled={!isValid || isSubmitting}
  >
    {isSubmitting ? t('common.loading') : (event ? t('common.save') : t('common.create'))}
  </Button>
</div>
```

Replace it with:

```tsx
{/* Actions */}
{event ? (
  <div className="flex justify-end h-9 items-center">
    {autoSaveStatus === 'saving' && (
      <span className="text-sm text-muted-foreground">Saving...</span>
    )}
    {autoSaveStatus === 'saved' && (
      <span className="text-sm text-muted-foreground">Saved ✓</span>
    )}
    {autoSaveStatus === 'error' && (
      <span className="text-sm text-destructive">Failed to save</span>
    )}
  </div>
) : (
  <div className="flex justify-end gap-2">
    {onCancel && (
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        {t('common.cancel')}
      </Button>
    )}
    <Button
      type="submit"
      disabled={!isValid || isSubmitting}
    >
      {isSubmitting ? t('common.loading') : t('common.create')}
    </Button>
  </div>
)}
```

- [ ] **Step 2: Remove the `handleSubmit` from the `<form>` tag in update mode**

The `<form onSubmit={handleSubmit}>` still wraps everything, which is fine — pressing Enter won't accidentally submit in update mode because there's no submit button. No change needed here.

- [ ] **Step 3: Type-check**

```bash
cd webapp && npm run tsc
```

Expected: no errors.

- [ ] **Step 4: Manual verification**

Start the dev server and open an existing event:

```bash
cd webapp && npm run dev
```

- Change the event title — after ~1s the "Saving..." indicator should appear briefly then "Saved ✓" for 2 seconds, then disappear.
- Refresh the page — the title change should be persisted.
- Try clearing the title (making it invalid) — nothing should be saved.
- Open the calendar and create a new event — the Create button should still appear and work normally.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/components/EventForm.tsx
git commit -m "feat: show auto-save status indicator in EventForm update mode"
```
