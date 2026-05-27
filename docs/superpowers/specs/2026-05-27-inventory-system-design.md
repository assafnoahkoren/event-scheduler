# Inventory System Design

**Date:** 2026-05-27  
**Status:** Approved for implementation

## Problem

The business buys drinks and alcohol in bulk for events but has no way to track what was purchased, where stock is stored, or how much was consumed per event. The result is systematic over-ordering because teams don't know what's already in the warehouse.

## Solution

A dedicated **Stock** module — separate from the existing Products catalog — that tracks inventory through four first-class operations: purchase orders (what we bought), arrivals (what physically arrived and where), movements (transfers between locations), and recounts (physical counts to correct the running balance).

---

## Data Model

Six tables. Two catalog tables define *what* and *where*. Three operation tables record business actions. One ledger table is the single source of truth for current balance.

### StockItem
The stock catalog — what you track in inventory.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| siteId | FK → Site | |
| name | string | e.g. "Coca-Cola 1.5L", "Vodka 1L" |
| description | string? | |
| unit | string | e.g. "bottle", "crate", "can", "liter" |
| isActive | boolean | soft disable |
| isDeleted | boolean | soft delete |
| createdAt, updatedAt | datetime | |

### StockLocation
Where stock physically lives.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| siteId | FK → Site | |
| name | string | e.g. "Main Warehouse", "Bar A", "External Bar" |
| description | string? | |
| isActive | boolean | |
| isDeleted | boolean | soft delete |
| createdAt, updatedAt | datetime | |

### PurchaseOrder
Represents a buying decision — "we ordered X units of Y item."

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| siteId | FK → Site | |
| itemId | FK → StockItem | |
| orderedQuantity | float | |
| status | enum | OPEN \| PARTIAL \| COMPLETE \| CANCELLED |
| supplierName | string? | |
| notes | string? | |
| orderDate | datetime | |
| expectedDeliveryDate | datetime? | |
| isDeleted | boolean | soft delete |
| createdAt, updatedAt | datetime | |

Status is updated automatically when arrivals are recorded:
- `sum(arrivals.quantity) === 0` → OPEN
- `0 < sum < orderedQuantity` → PARTIAL
- `sum >= orderedQuantity` → COMPLETE

### StockArrival
Records physical delivery tied to a purchase order.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| purchaseOrderId | FK → PurchaseOrder | |
| locationId | FK → StockLocation | where stock was placed |
| quantity | float | may be less than ordered |
| arrivedAt | datetime | |
| notes | string? | |
| isDeleted | boolean | soft delete |
| createdAt, updatedAt | datetime | |

Creating a StockArrival atomically:
1. Inserts the arrival row
2. Writes a `StockLedgerEntry` (type: `ARRIVAL`, `+quantity` at `locationId`)
3. Recomputes and updates PurchaseOrder status

### StockMovement
Records a transfer of stock between two locations (single row, not two).

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| siteId | FK → Site | |
| itemId | FK → StockItem | |
| fromLocationId | FK → StockLocation | |
| toLocationId | FK → StockLocation | |
| quantity | float | |
| movedAt | datetime | |
| notes | string? | |
| isDeleted | boolean | soft delete |
| createdAt, updatedAt | datetime | |

Creating a StockMovement atomically writes two `StockLedgerEntry` rows: `MOVEMENT_OUT` (−quantity at fromLocation) and `MOVEMENT_IN` (+quantity at toLocation).

The UI previews the after-state (warehouse will have X, bar will have Y) before the user confirms. The system validates that `fromLocation` has sufficient stock before allowing the movement.

### StockRecount
Records a physical count at a location. Used both for post-event reconciliation and for first-time setup of a location.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| siteId | FK → Site | |
| itemId | FK → StockItem | |
| locationId | FK → StockLocation | |
| countedQuantity | float | what was physically counted |
| previousQuantity | float | what the system computed before recount |
| countedAt | datetime | |
| notes | string? | |
| isDeleted | boolean | soft delete |
| createdAt, updatedAt | datetime | |

`adjustmentDelta = countedQuantity - previousQuantity` is derived, not stored. Creating a StockRecount atomically:
1. Computes current balance for (itemId, locationId) from the ledger
2. Stores `previousQuantity` = that balance
3. Writes a `StockLedgerEntry` with `quantityDelta = countedQuantity - previousQuantity`
   - Type: `INITIAL_COUNT` when `previousQuantity === 0` and no prior ledger entries exist
   - Type: `RECOUNT_ADJUSTMENT` otherwise

This means **first-time setup** (entering stock that already exists in a location before the system was introduced) uses the same flow as a regular post-event recount. The UI labels it "Initial Count" when `previousQuantity === 0` with no history; otherwise "Recount". No separate concept needed.

### StockLedgerEntry
The single source of truth for current stock balance. Every operation writes here atomically. Never edited directly.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| itemId | FK → StockItem | |
| locationId | FK → StockLocation | |
| quantityDelta | float | positive = stock in, negative = stock out |
| operationType | enum | ARRIVAL \| MOVEMENT_IN \| MOVEMENT_OUT \| INITIAL_COUNT \| RECOUNT_ADJUSTMENT |
| referenceId | string | id of the source operation row |
| createdAt | datetime | |

**No soft delete** — ledger entries are immutable. Corrections are made via new entries (recounts).

**Current balance query (Prisma):**
```typescript
const levels = await prisma.stockLedgerEntry.groupBy({
  by: ['itemId', 'locationId'],
  _sum: { quantityDelta: true },
})
```

**Performance:** With ~1,200 ledger rows/year and a composite index on `(itemId, locationId)`, this query runs in < 1ms even after years of use. No caching layer needed.

---

## API — tRPC Routers

### `stockItems`
- `list({ siteId })` — all items for a site
- `get({ id })` — single item
- `create({ siteId, name, description, unit })` — add to catalog
- `update({ id, name, description, unit, isActive })` — edit
- `delete({ id })` — soft delete

### `stockLocations`
- `list({ siteId })` — all locations for a site
- `create({ siteId, name, description })` — add location
- `update({ id, name, description, isActive })` — edit
- `delete({ id })` — soft delete

### `purchaseOrders`
- `list({ siteId, status? })` — all orders, filterable by status
- `get({ id })` — single order including its arrivals
- `create({ siteId, itemId, orderedQuantity, supplierName?, notes?, orderDate, expectedDeliveryDate? })`
- `cancel({ id })` — sets status to CANCELLED

### `stockArrivals`
- `create({ purchaseOrderId, locationId, quantity, arrivedAt, notes? })` — records arrival, updates PO status, writes ledger
- `list({ purchaseOrderId })` — all arrivals for an order

### `stockMovements`
- `create({ siteId, itemId, fromLocationId, toLocationId, quantity, movedAt, notes? })` — validates available stock, writes two ledger entries atomically
- `list({ siteId, itemId?, locationId? })` — movement history

### `stockRecounts`
- `create({ siteId, itemId, locationId, countedQuantity, countedAt, notes? })` — computes delta, writes ledger entry
- `list({ siteId, locationId?, itemId? })` — recount history

### `stockLevels`
- `list({ siteId })` — current balance for all (item, location) pairs → full stock dashboard
- `getByLocation({ locationId })` — all items at a location (used by recount flow to show expected quantities)
- `getByItem({ itemId })` — all locations holding an item (used by "check before ordering" flow)

---

## UI — Mobile-First

The Stock module is a top-level navigation section with sub-pages: **Levels**, **Orders**, **Movements**, **Recounts**, **Settings** (items + locations catalog).

### Design Principles (on-the-job mobile use)
- **Stepper input for all quantities** — large +/− buttons, no keyboard. Tap + for each unit counted/moved/received.
- **Action-first home screen** — "What are you doing right now?" with 3 large buttons: Record Arrival, Move Stock, Recount
- **Bottom sheet drawers** — forms slide up from bottom, no page navigation
- **Context pre-selection** — where possible, pre-select the location the user last used
- **Live delta feedback** — during recount, show "Expected: 48 / Counted: 23 / △ −25" in real time

### Recount Flow (most frequent post-event action)
1. Tap **Recount** → select location (bottom sheet picker)
2. Item-by-item counting screen:
   - Large item name + expected quantity shown
   - Giant count display (starts at 0)
   - Large +/− buttons — tap + for each unit physically counted
   - Live delta shown (e.g., "▼ 25 below expected")
   - "Next →" / "Skip" / "← Back" navigation
3. **Progress chip** (e.g., "3/8 items") is tappable → bottom sheet shows all items:
   - ✅ Green = counted and saved
   - 🔵 Purple / "NOW" = currently counting
   - ⬜ Grey = pending
   - Tap any item to jump to it; done items can be re-tapped to correct
4. When all items are done (or user taps Submit early) → confirmation screen showing all deltas → **Submit recount**

### Arrival Flow
1. Open **Orders** → see open/partial purchase orders
2. Tap an order → see order details + any prior arrivals
3. Tap **Record Arrival** → bottom sheet:
   - Item + ordered quantity shown at top
   - Stepper starting at 0 (tap + per crate/unit as unloaded from truck)
   - Location picker (where is this going?)
   - Warning shown if quantity < remaining: "10 still outstanding → order stays PARTIAL"
4. Confirm → arrival logged, order status auto-updated

### Movement Flow
1. Tap **Move Stock** → bottom sheet:
   - Item picker (tap item name → inner bottom sheet list)
   - From / To location pickers (swappable)
   - Stepper for quantity
   - Live after-state preview: "Warehouse: 96 · Bar A: 72"
   - Cannot exceed available stock at fromLocation (validated client + server side)
2. Tap **Log Movement** → done

### Stock Levels Dashboard
- Default view: matrix table — rows = items, columns = locations, cells = quantity, last column = total
- Tap any cell → quick action sheet (Move from here / Recount here)
- Tap any item row → item detail: history of all ledger entries for that item across all locations

---

## Out of Scope (Deferred)

- **Event linkage**: Consumption is not linked to specific events in this version. Since all events have a datetime, consumption can be inferred post-hoc by correlating recount timestamps with event dates. A future migration can add an optional `eventId` FK to `StockRecount` and `StockMovement`.
- **Low-stock alerts / reorder thresholds**: Not in scope. Can be added by introducing a `reorderThreshold` field on `StockItem`.
- **Supplier management**: Supplier name is a free-text field on PurchaseOrder. No supplier entity.
- **Cost tracking**: No purchase cost tracking in this version.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Separate from Products | New Stock catalog | Products are event line items; stock is physical inventory — different lifecycle |
| Balance computation | Sum ledger entries (no cached balance) | Transaction volume (~1,200/year) makes caching unnecessary; avoids sync bugs |
| Recount = initial count | Same mechanism, different label | `previousQuantity === 0` is a natural indicator; no duplicate concept needed |
| Movement as single row | One row with from/to | Cleaner than two paired rows; atomicity guaranteed by the two ledger entries |
| Mobile-first stepper | +/− buttons, no keyboard | Workers count one-by-one physically; tap-per-unit maps to physical reality |
| Bottom sheet navigation | Item list sheet for jumping | Avoids page transitions; keeps counting context while browsing all items |
