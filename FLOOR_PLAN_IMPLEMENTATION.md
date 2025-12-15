# Floor Plan Editor - Implementation Plan

## Overview

A visual drag-and-drop editor for placing components (tables, stages, bars, etc.) on a venue top-view image.

---

## Phase 1: Database Schema

### 1.1 Create ComponentType model
- [ ] Create `server/prisma/schema/floor-plans/component-type.prisma`
- [ ] Define fields: `id`, `organizationId`, `name`, `icon`, `category`, `defaultWidth`, `defaultHeight`
- [ ] Add relation to `Organization`
- [ ] Add soft delete fields and indexes

### 1.2 Create SiteFloorPlan model
- [ ] Create `server/prisma/schema/floor-plans/site-floor-plan.prisma`
- [ ] Define fields: `id`, `siteId`, `name`, `imageFileId`, `pixelsPerMeter`, `calibrationData` (Json), `sortOrder`
- [ ] `pixelsPerMeter`: Float — calculated from user calibration
- [ ] `calibrationData`: Json — stores `{ lineStart: {x, y}, lineEnd: {x, y}, realLengthMeters: number }`
- [ ] Add relation to `Site` and `UploadedFile`
- [ ] Add soft delete fields and indexes

### 1.3 Create SiteFloorPlanComponent model
- [ ] Add to `site-floor-plan.prisma`
- [ ] Define fields: `id`, `floorPlanId`, `componentTypeId`, `x`, `y`, `width`, `height`, `rotation`, `label`
- [ ] Add relations to `SiteFloorPlan` and `ComponentType`
- [ ] Add soft delete fields and indexes

### 1.4 Create EventFloorPlanLayout model
- [ ] Create `server/prisma/schema/floor-plans/event-floor-plan.prisma`
- [ ] Define fields: `id`, `eventId`, `floorPlanId`, `name`
- [ ] Add unique constraint on `[eventId, floorPlanId]`
- [ ] Add relations to `Event` and `SiteFloorPlan`
- [ ] Add soft delete fields and indexes

### 1.5 Create EventLayoutComponent model
- [ ] Add to `event-floor-plan.prisma`
- [ ] Define fields: `id`, `layoutId`, `componentTypeId`, `x`, `y`, `width`, `height`, `rotation`, `label`, `properties`
- [ ] Add relations to `EventFloorPlanLayout` and `ComponentType`
- [ ] Add soft delete fields and indexes

### 1.6 Update existing models
- [ ] Add `floorPlans` relation to `Site` model
- [ ] Add `floorPlanLayouts` relation to `Event` model
- [ ] Add `componentTypes` relation to `Organization` model

### 1.7 Run migration
- [ ] Run `npx prisma migrate dev --name add_floor_plan_models`
- [ ] Verify migration success
- [ ] Run `npm run tsc` in server

---

## Phase 2: API Layer

### 2.1 ComponentTypes Router
- [ ] Create `server/src/services/componentTypeService.ts`
  - [ ] Define Zod schemas for create/update
  - [ ] Implement `list(organizationId)`
  - [ ] Implement `create(data)`
  - [ ] Implement `update(id, data)`
  - [ ] Implement `delete(id)`
- [ ] Create `server/src/routers/componentTypesRouter.ts`
  - [ ] Wire up all procedures as protected routes
- [ ] Add to `appRouter.ts`
- [ ] Run `npm run tsc` in server

### 2.2 FloorPlans Router
- [ ] Create `server/src/services/floorPlanService.ts`
  - [ ] Define Zod schemas
  - [ ] Implement `list(siteId)`
  - [ ] Implement `get(id)` — include template components
  - [ ] Implement `create(data)`
  - [ ] Implement `update(id, data)`
  - [ ] Implement `delete(id)`
  - [ ] Implement `updateComponents(floorPlanId, components[])` — batch upsert
- [ ] Create `server/src/routers/floorPlansRouter.ts`
  - [ ] Wire up all procedures as protected routes
- [ ] Add to `appRouter.ts`
- [ ] Run `npm run tsc` in server

### 2.3 EventLayouts Router
- [ ] Create `server/src/services/eventLayoutService.ts`
  - [ ] Define Zod schemas
  - [ ] Implement `get(eventId, floorPlanId)`
  - [ ] Implement `create(eventId, floorPlanId)` — optionally copy from template
  - [ ] Implement `updateComponents(layoutId, components[])` — batch upsert
  - [ ] Implement `delete(layoutId)`
- [ ] Create `server/src/routers/eventLayoutsRouter.ts`
  - [ ] Wire up all procedures as protected routes
- [ ] Add to `appRouter.ts`
- [ ] Run `npm run tsc` in server

### 2.4 Seed default component types
- [ ] Create seed script or add to org creation flow
- [ ] Default components: Round Table (8), Round Table (10), Rectangular Table, Stage, DJ Booth, Bar, Dance Floor
- [ ] Run `npm run tsc` in server

---

## Phase 3: Frontend - Site Floor Plan Management

### 3.1 Install dependencies
- [ ] Run `npm install react-konva konva use-image` in webapp
- [ ] Run `npm run tsc` in webapp

### 3.2 Create Floor Plans page
- [ ] Create `webapp/src/pages/sites/FloorPlans.tsx`
- [ ] List existing floor plans for current site
- [ ] Add "New Floor Plan" button
- [ ] Add edit/delete actions per floor plan
- [ ] Add route to React Router

### 3.3 Create Floor Plan form dialog
- [ ] Create `webapp/src/components/floor-plan/FloorPlanFormDialog.tsx`
- [ ] Fields: name, image upload
- [ ] Use existing file upload components
- [ ] Handle create and update modes

### 3.4 Create Calibration UI
- [ ] Create `webapp/src/components/floor-plan/CalibrationOverlay.tsx`
- [ ] Display floor plan image with draggable line endpoints
- [ ] User draws a line on a known-length reference (wall, door, etc.)
- [ ] Input field for "This line represents X meters"
- [ ] Calculate and save `pixelsPerMeter` from line pixel length / real meters
- [ ] Store calibration data for future re-calibration

### 3.5 Create Floor Plan template editor
- [ ] Create `webapp/src/components/floor-plan/FloorPlanEditor.tsx`
  - [ ] Stage with background image layer
  - [ ] Components layer with draggable items
  - [ ] Selection state management
- [ ] Create `webapp/src/components/floor-plan/CanvasComponent.tsx`
  - [ ] Render component shape based on type
  - [ ] Handle drag, resize, rotate
  - [ ] Show label
- [ ] Create `webapp/src/components/floor-plan/ComponentPalette.tsx`
  - [ ] List component types from org
  - [ ] Drag to add to canvas
- [ ] Create `webapp/src/components/floor-plan/CanvasToolbar.tsx`
  - [ ] Zoom controls
  - [ ] Delete selected component
  - [ ] Save status indicator

### 3.6 Create canvas hooks
- [ ] Create `webapp/src/components/floor-plan/hooks/useCanvasScale.ts`
  - [ ] Calculate pixels-per-meter scale
  - [ ] Provide `toCanvas()` and `toRealWorld()` converters
- [ ] Create `webapp/src/components/floor-plan/hooks/useAutoSave.ts`
  - [ ] Debounced save (1 second after last change)
  - [ ] Save status state (saving, saved, error)

### 3.7 Wire up to site navigation
- [ ] Add "Floor Plans" link to site settings/navigation
- [ ] Run `npm run tsc` in webapp

---

## Phase 4: Frontend - Event Floor Plan Tab

### 4.1 Create Event Floor Plan tab
- [ ] Create `webapp/src/components/event-tabs/EventFloorPlanTab.tsx`
- [ ] Show floor plan selector if site has multiple
- [ ] Show "No floor plans" message with link to site settings if none exist
- [ ] Load or create event layout when floor plan selected

### 4.2 Integrate editor for events
- [ ] Reuse `FloorPlanEditor` component
- [ ] Pass event layout components instead of template components
- [ ] Auto-save to `eventLayouts.updateComponents`

### 4.3 Add tab to Event page
- [ ] Add "Floor Plan" tab to `webapp/src/pages/Event.tsx`
- [ ] Add translation keys for tab label
- [ ] Run `npm run tsc` in webapp

---

## Phase 5: Polish & Testing

### 5.1 Component type management UI
- [ ] Create component type CRUD in site/org settings
- [ ] Allow custom icons or colors per type

### 5.2 Mobile responsiveness
- [ ] Test canvas on mobile viewports
- [ ] Add touch gesture support if needed

### 5.3 Error handling
- [ ] Handle image load failures
- [ ] Handle save failures with retry

### 5.4 Testing
- [ ] Test floor plan CRUD
- [ ] Test component placement and saving
- [ ] Test event layout creation and editing
- [ ] Run type checking: `npm run tsc` in both server and webapp

---

## File Structure Summary

```
server/
├── prisma/schema/
│   └── floor-plans/
│       ├── component-type.prisma
│       ├── site-floor-plan.prisma
│       └── event-floor-plan.prisma
├── src/
│   ├── services/
│   │   ├── componentTypeService.ts
│   │   ├── floorPlanService.ts
│   │   └── eventLayoutService.ts
│   └── routers/
│       ├── componentTypesRouter.ts
│       ├── floorPlansRouter.ts
│       ├── eventLayoutsRouter.ts
│       └── appRouter.ts (updated)

webapp/
├── src/
│   ├── components/
│   │   ├── floor-plan/
│   │   │   ├── FloorPlanEditor.tsx
│   │   │   ├── CanvasComponent.tsx
│   │   │   ├── ComponentPalette.tsx
│   │   │   ├── CanvasToolbar.tsx
│   │   │   ├── FloorPlanFormDialog.tsx
│   │   │   ├── CalibrationOverlay.tsx
│   │   │   └── hooks/
│   │   │       ├── useCanvasScale.ts
│   │   │       └── useAutoSave.ts
│   │   └── event-tabs/
│   │       └── EventFloorPlanTab.tsx
│   └── pages/
│       └── sites/
│           └── FloorPlans.tsx
```

---

## Dependencies

```json
{
  "react-konva": "^18.2.10",
  "konva": "^9.3.6",
  "use-image": "^1.1.1"
}
```
