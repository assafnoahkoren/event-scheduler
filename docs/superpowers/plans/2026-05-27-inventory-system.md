# Inventory System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Stock inventory module that tracks drinks/alcohol across locations via purchase orders, arrivals, movements, and post-event recounts — all with a mobile-first stepper-based UI.

**Architecture:** Six Prisma models (StockItem, StockLocation, PurchaseOrder, StockArrival, StockMovement, StockRecount, StockLedgerEntry) feed seven tRPC routers. Every mutating operation atomically writes to a StockLedgerEntry table; current balance is computed via `groupBy._sum`. The frontend is mobile-first with stepper (+ / −) inputs and bottom-sheet drawers.

**Tech Stack:** Prisma 6 (multi-file schema), tRPC v11, Zod v4, React + Tailwind, react-router-dom, react-i18next, shadcn/ui (Dialog/Drawer components), lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-05-27-inventory-system-design.md`

---

## File Map

### Server — New Files
- `server/prisma/schema/stock/stock-item.prisma`
- `server/prisma/schema/stock/stock-location.prisma`
- `server/prisma/schema/stock/purchase-order.prisma`
- `server/prisma/schema/stock/stock-arrival.prisma`
- `server/prisma/schema/stock/stock-movement.prisma`
- `server/prisma/schema/stock/stock-recount.prisma`
- `server/prisma/schema/stock/stock-ledger-entry.prisma`
- `server/src/services/stock/stock-items.service.ts`
- `server/src/services/stock/stock-locations.service.ts`
- `server/src/services/stock/purchase-orders.service.ts`
- `server/src/services/stock/stock-arrivals.service.ts`
- `server/src/services/stock/stock-movements.service.ts`
- `server/src/services/stock/stock-recounts.service.ts`
- `server/src/services/stock/stock-levels.service.ts`
- `server/src/routers/stock/stock-items.router.ts`
- `server/src/routers/stock/stock-locations.router.ts`
- `server/src/routers/stock/purchase-orders.router.ts`
- `server/src/routers/stock/stock-arrivals.router.ts`
- `server/src/routers/stock/stock-movements.router.ts`
- `server/src/routers/stock/stock-recounts.router.ts`
- `server/src/routers/stock/stock-levels.router.ts`
- `server/src/routers/stock/index.ts`

### Server — Modified Files
- `server/src/routers/appRouter.ts` — register `stock` router

### Webapp — New Files
- `webapp/src/pages/stock/StockPage.tsx` — action-first home screen
- `webapp/src/pages/stock/StockLevels.tsx` — matrix dashboard
- `webapp/src/pages/stock/PurchaseOrdersPage.tsx` — orders list
- `webapp/src/pages/stock/StockSettings.tsx` — item + location CRUD
- `webapp/src/components/stock/StockStepper.tsx` — reusable +/− stepper
- `webapp/src/components/stock/ItemListSheet.tsx` — bottom sheet for jumping between items during recount
- `webapp/src/components/stock/RecountFlow.tsx` — item-by-item counting screen
- `webapp/src/components/stock/RecordArrivalSheet.tsx` — arrival recording drawer
- `webapp/src/components/stock/MoveStockSheet.tsx` — movement recording drawer

### Webapp — Modified Files
- `webapp/src/App.tsx` — add `/stock` routes
- `webapp/src/components/Sidebar.tsx` — add Stock nav item
- `webapp/src/i18n/locales/en/translation.ts` — add `stock` namespace

---

## Task 1: Prisma Schema — Stock Models

**Files:**
- Create: `server/prisma/schema/stock/stock-item.prisma`
- Create: `server/prisma/schema/stock/stock-location.prisma`
- Create: `server/prisma/schema/stock/purchase-order.prisma`
- Create: `server/prisma/schema/stock/stock-arrival.prisma`
- Create: `server/prisma/schema/stock/stock-movement.prisma`
- Create: `server/prisma/schema/stock/stock-recount.prisma`
- Create: `server/prisma/schema/stock/stock-ledger-entry.prisma`

- [ ] **Step 1: Create StockItem schema**

```prisma
// server/prisma/schema/stock/stock-item.prisma
model StockItem {
  id          String   @id @default(uuid())

  siteId      String   @map("site_id")
  site        Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)

  name        String
  description String?
  unit        String   // "bottle", "crate", "can", "liter", etc.

  isActive    Boolean  @default(true) @map("is_active")
  isDeleted   Boolean  @default(false) @map("is_deleted")
  deletedAt   DateTime? @map("deleted_at")

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  purchaseOrders PurchaseOrder[]
  movements      StockMovement[]
  recounts       StockRecount[]
  ledgerEntries  StockLedgerEntry[]

  @@index([siteId])
  @@index([isDeleted])
  @@index([siteId, isDeleted])
  @@map("stock_items")
}
```

- [ ] **Step 2: Create StockLocation schema**

```prisma
// server/prisma/schema/stock/stock-location.prisma
model StockLocation {
  id          String   @id @default(uuid())

  siteId      String   @map("site_id")
  site        Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)

  name        String
  description String?

  isActive    Boolean  @default(true) @map("is_active")
  isDeleted   Boolean  @default(false) @map("is_deleted")
  deletedAt   DateTime? @map("deleted_at")

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  arrivals      StockArrival[]
  movementsFrom StockMovement[] @relation("MovementFrom")
  movementsTo   StockMovement[] @relation("MovementTo")
  recounts      StockRecount[]
  ledgerEntries StockLedgerEntry[]

  @@index([siteId])
  @@index([isDeleted])
  @@index([siteId, isDeleted])
  @@map("stock_locations")
}
```

- [ ] **Step 3: Create PurchaseOrder schema**

```prisma
// server/prisma/schema/stock/purchase-order.prisma
model PurchaseOrder {
  id                   String              @id @default(uuid())

  siteId               String              @map("site_id")
  site                 Site                @relation(fields: [siteId], references: [id], onDelete: Cascade)

  itemId               String              @map("item_id")
  item                 StockItem           @relation(fields: [itemId], references: [id])

  orderedQuantity      Float               @map("ordered_quantity")
  status               PurchaseOrderStatus @default(OPEN)

  supplierName         String?             @map("supplier_name")
  notes                String?

  orderDate            DateTime            @map("order_date")
  expectedDeliveryDate DateTime?           @map("expected_delivery_date")

  isDeleted   Boolean  @default(false) @map("is_deleted")
  deletedAt   DateTime? @map("deleted_at")

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  arrivals StockArrival[]

  @@index([siteId])
  @@index([isDeleted])
  @@index([siteId, status])
  @@map("purchase_orders")
}

enum PurchaseOrderStatus {
  OPEN
  PARTIAL
  COMPLETE
  CANCELLED
}
```

- [ ] **Step 4: Create StockArrival schema**

```prisma
// server/prisma/schema/stock/stock-arrival.prisma
model StockArrival {
  id              String        @id @default(uuid())

  purchaseOrderId String        @map("purchase_order_id")
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)

  locationId      String        @map("location_id")
  location        StockLocation @relation(fields: [locationId], references: [id])

  quantity        Float
  arrivedAt       DateTime      @map("arrived_at")
  notes           String?

  isDeleted   Boolean  @default(false) @map("is_deleted")
  deletedAt   DateTime? @map("deleted_at")

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([purchaseOrderId])
  @@index([locationId])
  @@index([isDeleted])
  @@map("stock_arrivals")
}
```

- [ ] **Step 5: Create StockMovement schema**

```prisma
// server/prisma/schema/stock/stock-movement.prisma
model StockMovement {
  id             String        @id @default(uuid())

  siteId         String        @map("site_id")
  site           Site          @relation(fields: [siteId], references: [id], onDelete: Cascade)

  itemId         String        @map("item_id")
  item           StockItem     @relation(fields: [itemId], references: [id])

  fromLocationId String        @map("from_location_id")
  fromLocation   StockLocation @relation("MovementFrom", fields: [fromLocationId], references: [id])

  toLocationId   String        @map("to_location_id")
  toLocation     StockLocation @relation("MovementTo", fields: [toLocationId], references: [id])

  quantity       Float
  movedAt        DateTime      @map("moved_at")
  notes          String?

  isDeleted   Boolean  @default(false) @map("is_deleted")
  deletedAt   DateTime? @map("deleted_at")

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([siteId])
  @@index([itemId])
  @@index([fromLocationId])
  @@index([toLocationId])
  @@index([isDeleted])
  @@map("stock_movements")
}
```

- [ ] **Step 6: Create StockRecount schema**

```prisma
// server/prisma/schema/stock/stock-recount.prisma
model StockRecount {
  id               String        @id @default(uuid())

  siteId           String        @map("site_id")
  site             Site          @relation(fields: [siteId], references: [id], onDelete: Cascade)

  itemId           String        @map("item_id")
  item             StockItem     @relation(fields: [itemId], references: [id])

  locationId       String        @map("location_id")
  location         StockLocation @relation(fields: [locationId], references: [id])

  countedQuantity  Float         @map("counted_quantity")
  previousQuantity Float         @map("previous_quantity")
  countedAt        DateTime      @map("counted_at")
  notes            String?

  isDeleted   Boolean  @default(false) @map("is_deleted")
  deletedAt   DateTime? @map("deleted_at")

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([siteId])
  @@index([itemId])
  @@index([locationId])
  @@index([isDeleted])
  @@map("stock_recounts")
}
```

- [ ] **Step 7: Create StockLedgerEntry schema**

```prisma
// server/prisma/schema/stock/stock-ledger-entry.prisma
model StockLedgerEntry {
  id            String           @id @default(uuid())

  itemId        String           @map("item_id")
  item          StockItem        @relation(fields: [itemId], references: [id])

  locationId    String           @map("location_id")
  location      StockLocation    @relation(fields: [locationId], references: [id])

  quantityDelta Float            @map("quantity_delta")
  operationType LedgerEntryType  @map("operation_type")
  referenceId   String           @map("reference_id")

  createdAt     DateTime         @default(now()) @map("created_at")

  @@index([itemId, locationId])
  @@index([locationId])
  @@index([itemId])
  @@map("stock_ledger_entries")
}

enum LedgerEntryType {
  ARRIVAL
  MOVEMENT_IN
  MOVEMENT_OUT
  INITIAL_COUNT
  RECOUNT_ADJUSTMENT
}
```

- [ ] **Step 8: Add relations back on Site model**

Open `server/prisma/schema/sites/site.prisma` and add the new relations to the `Site` model:

```prisma
// Add inside the Site model body, with other relations:
stockItems     StockItem[]
stockLocations StockLocation[]
purchaseOrders PurchaseOrder[]
stockMovements StockMovement[]
stockRecounts  StockRecount[]
```

- [ ] **Step 9: Run migration**

```bash
cd server
npx prisma migrate dev --name add_inventory_system
```

Expected: migration created and applied, Prisma client regenerated.

- [ ] **Step 10: Verify TypeScript**

```bash
cd server
npm run tsc
```

Expected: no errors.

---

## Task 2: Stock Items Service + Router

**Files:**
- Create: `server/src/services/stock/stock-items.service.ts`
- Create: `server/src/routers/stock/stock-items.router.ts`

- [ ] **Step 1: Create the service**

```typescript
// server/src/services/stock/stock-items.service.ts
import { z } from 'zod'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

export const createStockItemSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  unit: z.string().min(1),
})

export const updateStockItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  unit: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})

export type CreateStockItemInput = z.infer<typeof createStockItemSchema>
export type UpdateStockItemInput = z.infer<typeof updateStockItemSchema>

class StockItemsService {
  async assertSiteAccess(userId: string, siteId: string) {
    const siteUser = await prisma.siteUser.findUnique({
      where: { userId_siteId: { userId, siteId } },
    })
    if (!siteUser) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this site' })
    }
    return siteUser
  }

  async list(userId: string, siteId: string) {
    await this.assertSiteAccess(userId, siteId)
    return prisma.stockItem.findMany({
      where: { siteId, isDeleted: false },
      orderBy: { name: 'asc' },
    })
  }

  async get(userId: string, id: string) {
    const item = await prisma.stockItem.findFirst({
      where: { id, isDeleted: false },
      include: { site: { include: { siteUsers: { where: { userId } } } } },
    })
    if (!item || item.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Stock item not found' })
    }
    return item
  }

  async create(userId: string, input: CreateStockItemInput) {
    const siteUser = await this.assertSiteAccess(userId, input.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    return prisma.stockItem.create({ data: input })
  }

  async update(userId: string, input: UpdateStockItemInput) {
    const { id, ...data } = input
    const item = await this.get(userId, id)
    const siteUser = await this.assertSiteAccess(userId, item.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    return prisma.stockItem.update({ where: { id }, data })
  }

  async delete(userId: string, id: string) {
    const item = await this.get(userId, id)
    const siteUser = await this.assertSiteAccess(userId, item.siteId)
    if (!['OWNER', 'ADMIN'].includes(siteUser.role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    await prisma.stockItem.delete({ where: { id } })
    return { success: true }
  }
}

export const stockItemsService = new StockItemsService()
```

- [ ] **Step 2: Create the router**

```typescript
// server/src/routers/stock/stock-items.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import {
  stockItemsService,
  createStockItemSchema,
  updateStockItemSchema,
} from '../../services/stock/stock-items.service'

export const stockItemsRouter = router({
  list: protectedProcedure
    .input(z.object({ siteId: z.string().uuid() }))
    .query(({ ctx, input }) => stockItemsService.list(ctx.user.id, input.siteId)),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => stockItemsService.get(ctx.user.id, input.id)),

  create: protectedProcedure
    .input(createStockItemSchema)
    .mutation(({ ctx, input }) => stockItemsService.create(ctx.user.id, input)),

  update: protectedProcedure
    .input(updateStockItemSchema)
    .mutation(({ ctx, input }) => stockItemsService.update(ctx.user.id, input)),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => stockItemsService.delete(ctx.user.id, input.id)),
})
```

- [ ] **Step 3: Type-check**

```bash
cd server && npm run tsc
```

Expected: no errors.

---

## Task 3: Stock Locations Service + Router

**Files:**
- Create: `server/src/services/stock/stock-locations.service.ts`
- Create: `server/src/routers/stock/stock-locations.router.ts`

- [ ] **Step 1: Create the service**

```typescript
// server/src/services/stock/stock-locations.service.ts
import { z } from 'zod'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

export const createStockLocationSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
})

export const updateStockLocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type CreateStockLocationInput = z.infer<typeof createStockLocationSchema>
export type UpdateStockLocationInput = z.infer<typeof updateStockLocationSchema>

class StockLocationsService {
  async assertSiteAccess(userId: string, siteId: string) {
    const siteUser = await prisma.siteUser.findUnique({
      where: { userId_siteId: { userId, siteId } },
    })
    if (!siteUser) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this site' })
    }
    return siteUser
  }

  async list(userId: string, siteId: string) {
    await this.assertSiteAccess(userId, siteId)
    return prisma.stockLocation.findMany({
      where: { siteId, isDeleted: false },
      orderBy: { name: 'asc' },
    })
  }

  async get(userId: string, id: string) {
    const location = await prisma.stockLocation.findFirst({
      where: { id, isDeleted: false },
      include: { site: { include: { siteUsers: { where: { userId } } } } },
    })
    if (!location || location.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Stock location not found' })
    }
    return location
  }

  async create(userId: string, input: CreateStockLocationInput) {
    const siteUser = await this.assertSiteAccess(userId, input.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    return prisma.stockLocation.create({ data: input })
  }

  async update(userId: string, input: UpdateStockLocationInput) {
    const { id, ...data } = input
    const location = await this.get(userId, id)
    const siteUser = await this.assertSiteAccess(userId, location.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    return prisma.stockLocation.update({ where: { id }, data })
  }

  async delete(userId: string, id: string) {
    const location = await this.get(userId, id)
    const siteUser = await this.assertSiteAccess(userId, location.siteId)
    if (!['OWNER', 'ADMIN'].includes(siteUser.role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    await prisma.stockLocation.delete({ where: { id } })
    return { success: true }
  }
}

export const stockLocationsService = new StockLocationsService()
```

- [ ] **Step 2: Create the router**

```typescript
// server/src/routers/stock/stock-locations.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import {
  stockLocationsService,
  createStockLocationSchema,
  updateStockLocationSchema,
} from '../../services/stock/stock-locations.service'

export const stockLocationsRouter = router({
  list: protectedProcedure
    .input(z.object({ siteId: z.string().uuid() }))
    .query(({ ctx, input }) => stockLocationsService.list(ctx.user.id, input.siteId)),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => stockLocationsService.get(ctx.user.id, input.id)),

  create: protectedProcedure
    .input(createStockLocationSchema)
    .mutation(({ ctx, input }) => stockLocationsService.create(ctx.user.id, input)),

  update: protectedProcedure
    .input(updateStockLocationSchema)
    .mutation(({ ctx, input }) => stockLocationsService.update(ctx.user.id, input)),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => stockLocationsService.delete(ctx.user.id, input.id)),
})
```

- [ ] **Step 3: Type-check**

```bash
cd server && npm run tsc
```

Expected: no errors.

---

## Task 4: Purchase Orders Service + Router

**Files:**
- Create: `server/src/services/stock/purchase-orders.service.ts`
- Create: `server/src/routers/stock/purchase-orders.router.ts`

- [ ] **Step 1: Create the service**

```typescript
// server/src/services/stock/purchase-orders.service.ts
import { z } from 'zod'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

export const createPurchaseOrderSchema = z.object({
  siteId: z.string().uuid(),
  itemId: z.string().uuid(),
  orderedQuantity: z.number().positive(),
  supplierName: z.string().optional(),
  notes: z.string().optional(),
  orderDate: z.string().datetime(),
  expectedDeliveryDate: z.string().datetime().optional(),
})

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>

class PurchaseOrdersService {
  async assertSiteAccess(userId: string, siteId: string) {
    const siteUser = await prisma.siteUser.findUnique({
      where: { userId_siteId: { userId, siteId } },
    })
    if (!siteUser) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this site' })
    }
    return siteUser
  }

  async list(userId: string, siteId: string, status?: string) {
    await this.assertSiteAccess(userId, siteId)
    return prisma.purchaseOrder.findMany({
      where: {
        siteId,
        isDeleted: false,
        ...(status ? { status: status as any } : {}),
      },
      include: { item: true, arrivals: { where: { isDeleted: false } } },
      orderBy: { orderDate: 'desc' },
    })
  }

  async get(userId: string, id: string) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id, isDeleted: false },
      include: {
        item: true,
        arrivals: {
          where: { isDeleted: false },
          include: { location: true },
          orderBy: { arrivedAt: 'desc' },
        },
        site: { include: { siteUsers: { where: { userId } } } },
      },
    })
    if (!order || order.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' })
    }
    return order
  }

  async create(userId: string, input: CreatePurchaseOrderInput) {
    const siteUser = await this.assertSiteAccess(userId, input.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    return prisma.purchaseOrder.create({
      data: {
        ...input,
        orderDate: new Date(input.orderDate),
        expectedDeliveryDate: input.expectedDeliveryDate
          ? new Date(input.expectedDeliveryDate)
          : undefined,
      },
      include: { item: true },
    })
  }

  async cancel(userId: string, id: string) {
    const order = await this.get(userId, id)
    const siteUser = await this.assertSiteAccess(userId, order.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
    if (order.status === 'COMPLETE') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot cancel a completed order' })
    }
    return prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })
  }
}

export const purchaseOrdersService = new PurchaseOrdersService()
```

- [ ] **Step 2: Create the router**

```typescript
// server/src/routers/stock/purchase-orders.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import {
  purchaseOrdersService,
  createPurchaseOrderSchema,
} from '../../services/stock/purchase-orders.service'

export const purchaseOrdersRouter = router({
  list: protectedProcedure
    .input(z.object({
      siteId: z.string().uuid(),
      status: z.enum(['OPEN', 'PARTIAL', 'COMPLETE', 'CANCELLED']).optional(),
    }))
    .query(({ ctx, input }) =>
      purchaseOrdersService.list(ctx.user.id, input.siteId, input.status)
    ),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => purchaseOrdersService.get(ctx.user.id, input.id)),

  create: protectedProcedure
    .input(createPurchaseOrderSchema)
    .mutation(({ ctx, input }) => purchaseOrdersService.create(ctx.user.id, input)),

  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => purchaseOrdersService.cancel(ctx.user.id, input.id)),
})
```

- [ ] **Step 3: Type-check**

```bash
cd server && npm run tsc
```

Expected: no errors.

---

## Task 5: Stock Arrivals Service + Router (Atomic)

**Files:**
- Create: `server/src/services/stock/stock-arrivals.service.ts`
- Create: `server/src/routers/stock/stock-arrivals.router.ts`

- [ ] **Step 1: Create the service**

This is the first atomic operation: creates an arrival row + a ledger entry + recomputes PO status, all in one `$transaction`.

```typescript
// server/src/services/stock/stock-arrivals.service.ts
import { z } from 'zod'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

export const createStockArrivalSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().positive(),
  arrivedAt: z.string().datetime(),
  notes: z.string().optional(),
})

export type CreateStockArrivalInput = z.infer<typeof createStockArrivalSchema>

class StockArrivalsService {
  async create(userId: string, input: CreateStockArrivalInput) {
    // Load the purchase order (verifies it exists and user has access)
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: input.purchaseOrderId, isDeleted: false },
      include: {
        site: { include: { siteUsers: { where: { userId } } } },
        arrivals: { where: { isDeleted: false } },
      },
    })

    if (!order || order.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' })
    }

    const siteUser = order.site.siteUsers[0]
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }

    if (order.status === 'CANCELLED') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot add arrival to a cancelled order' })
    }

    // Compute new PO status
    const previousTotal = order.arrivals.reduce((sum, a) => sum + a.quantity, 0)
    const newTotal = previousTotal + input.quantity
    const newStatus =
      newTotal >= order.orderedQuantity
        ? 'COMPLETE'
        : newTotal > 0
        ? 'PARTIAL'
        : 'OPEN'

    // Atomic: create arrival + ledger entry + update PO status
    const [arrival] = await prisma.$transaction([
      prisma.stockArrival.create({
        data: {
          purchaseOrderId: input.purchaseOrderId,
          locationId: input.locationId,
          quantity: input.quantity,
          arrivedAt: new Date(input.arrivedAt),
          notes: input.notes,
        },
      }),
      prisma.stockLedgerEntry.create({
        data: {
          itemId: order.itemId,
          locationId: input.locationId,
          quantityDelta: input.quantity,
          operationType: 'ARRIVAL',
          referenceId: '', // will be updated below — see note
        },
      }),
      prisma.purchaseOrder.update({
        where: { id: input.purchaseOrderId },
        data: { status: newStatus },
      }),
    ])

    // Update ledger entry referenceId now that we have the arrival id
    await prisma.stockLedgerEntry.updateMany({
      where: {
        referenceId: '',
        operationType: 'ARRIVAL',
        itemId: order.itemId,
        locationId: input.locationId,
      },
      data: { referenceId: arrival.id },
    })

    return arrival
  }

  async list(userId: string, purchaseOrderId: string) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, isDeleted: false },
      include: { site: { include: { siteUsers: { where: { userId } } } } },
    })
    if (!order || order.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Purchase order not found' })
    }
    return prisma.stockArrival.findMany({
      where: { purchaseOrderId, isDeleted: false },
      include: { location: true },
      orderBy: { arrivedAt: 'desc' },
    })
  }
}

export const stockArrivalsService = new StockArrivalsService()
```

> **Note on referenceId:** The arrival id isn't known before the transaction commits. The workaround above uses a two-step approach: create with empty referenceId, then update. A cleaner alternative is to generate the UUID before the transaction using `import { v4 as uuidv4 } from 'uuid'` and passing it as the `id` in both the arrival and ledger entry. Use that approach if the `uuid` package is available (it is — it's in `server/package.json`).

- [ ] **Step 2: Refactor using pre-generated UUID (cleaner)**

Replace the `create` method body with:

```typescript
import { v4 as uuidv4 } from 'uuid'

// Inside create(), before the $transaction:
const arrivalId = uuidv4()

const [arrival] = await prisma.$transaction([
  prisma.stockArrival.create({
    data: {
      id: arrivalId,
      purchaseOrderId: input.purchaseOrderId,
      locationId: input.locationId,
      quantity: input.quantity,
      arrivedAt: new Date(input.arrivedAt),
      notes: input.notes,
    },
  }),
  prisma.stockLedgerEntry.create({
    data: {
      itemId: order.itemId,
      locationId: input.locationId,
      quantityDelta: input.quantity,
      operationType: 'ARRIVAL',
      referenceId: arrivalId,
    },
  }),
  prisma.purchaseOrder.update({
    where: { id: input.purchaseOrderId },
    data: { status: newStatus },
  }),
])

return arrival
```

- [ ] **Step 3: Create the router**

```typescript
// server/src/routers/stock/stock-arrivals.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import {
  stockArrivalsService,
  createStockArrivalSchema,
} from '../../services/stock/stock-arrivals.service'

export const stockArrivalsRouter = router({
  create: protectedProcedure
    .input(createStockArrivalSchema)
    .mutation(({ ctx, input }) => stockArrivalsService.create(ctx.user.id, input)),

  list: protectedProcedure
    .input(z.object({ purchaseOrderId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      stockArrivalsService.list(ctx.user.id, input.purchaseOrderId)
    ),
})
```

- [ ] **Step 4: Type-check**

```bash
cd server && npm run tsc
```

Expected: no errors.

---

## Task 6: Stock Movements Service + Router (Atomic)

**Files:**
- Create: `server/src/services/stock/stock-movements.service.ts`
- Create: `server/src/routers/stock/stock-movements.router.ts`

- [ ] **Step 1: Create the service**

```typescript
// server/src/services/stock/stock-movements.service.ts
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

export const createStockMovementSchema = z.object({
  siteId: z.string().uuid(),
  itemId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  quantity: z.number().positive(),
  movedAt: z.string().datetime(),
  notes: z.string().optional(),
})

export const listStockMovementsSchema = z.object({
  siteId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
})

export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>

class StockMovementsService {
  async assertSiteAccess(userId: string, siteId: string) {
    const siteUser = await prisma.siteUser.findUnique({
      where: { userId_siteId: { userId, siteId } },
    })
    if (!siteUser) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this site' })
    }
    return siteUser
  }

  /** Returns the current balance for (itemId, locationId) from the ledger. */
  async getBalance(itemId: string, locationId: string): Promise<number> {
    const result = await prisma.stockLedgerEntry.aggregate({
      where: { itemId, locationId },
      _sum: { quantityDelta: true },
    })
    return result._sum.quantityDelta ?? 0
  }

  async create(userId: string, input: CreateStockMovementInput) {
    const siteUser = await this.assertSiteAccess(userId, input.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }

    if (input.fromLocationId === input.toLocationId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'From and To locations must differ' })
    }

    // Validate sufficient stock at source location
    const available = await this.getBalance(input.itemId, input.fromLocationId)
    if (available < input.quantity) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Insufficient stock: ${available} available, ${input.quantity} requested`,
      })
    }

    const movementId = uuidv4()

    await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          id: movementId,
          siteId: input.siteId,
          itemId: input.itemId,
          fromLocationId: input.fromLocationId,
          toLocationId: input.toLocationId,
          quantity: input.quantity,
          movedAt: new Date(input.movedAt),
          notes: input.notes,
        },
      }),
      prisma.stockLedgerEntry.create({
        data: {
          itemId: input.itemId,
          locationId: input.fromLocationId,
          quantityDelta: -input.quantity,
          operationType: 'MOVEMENT_OUT',
          referenceId: movementId,
        },
      }),
      prisma.stockLedgerEntry.create({
        data: {
          itemId: input.itemId,
          locationId: input.toLocationId,
          quantityDelta: input.quantity,
          operationType: 'MOVEMENT_IN',
          referenceId: movementId,
        },
      }),
    ])

    return prisma.stockMovement.findUnique({
      where: { id: movementId },
      include: { item: true, fromLocation: true, toLocation: true },
    })
  }

  async list(userId: string, input: { siteId: string; itemId?: string; locationId?: string }) {
    await this.assertSiteAccess(userId, input.siteId)
    return prisma.stockMovement.findMany({
      where: {
        siteId: input.siteId,
        isDeleted: false,
        ...(input.itemId ? { itemId: input.itemId } : {}),
        ...(input.locationId
          ? { OR: [{ fromLocationId: input.locationId }, { toLocationId: input.locationId }] }
          : {}),
      },
      include: { item: true, fromLocation: true, toLocation: true },
      orderBy: { movedAt: 'desc' },
    })
  }
}

export const stockMovementsService = new StockMovementsService()
```

- [ ] **Step 2: Create the router**

```typescript
// server/src/routers/stock/stock-movements.router.ts
import { router, protectedProcedure } from '../../trpc'
import {
  stockMovementsService,
  createStockMovementSchema,
  listStockMovementsSchema,
} from '../../services/stock/stock-movements.service'

export const stockMovementsRouter = router({
  create: protectedProcedure
    .input(createStockMovementSchema)
    .mutation(({ ctx, input }) => stockMovementsService.create(ctx.user.id, input)),

  list: protectedProcedure
    .input(listStockMovementsSchema)
    .query(({ ctx, input }) => stockMovementsService.list(ctx.user.id, input)),
})
```

- [ ] **Step 3: Type-check**

```bash
cd server && npm run tsc
```

Expected: no errors.

---

## Task 7: Stock Recounts Service + Router (Atomic)

**Files:**
- Create: `server/src/services/stock/stock-recounts.service.ts`
- Create: `server/src/routers/stock/stock-recounts.router.ts`

- [ ] **Step 1: Create the service**

```typescript
// server/src/services/stock/stock-recounts.service.ts
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

export const createStockRecountSchema = z.object({
  siteId: z.string().uuid(),
  itemId: z.string().uuid(),
  locationId: z.string().uuid(),
  countedQuantity: z.number().min(0),
  countedAt: z.string().datetime(),
  notes: z.string().optional(),
})

export type CreateStockRecountInput = z.infer<typeof createStockRecountSchema>

class StockRecountsService {
  async assertSiteAccess(userId: string, siteId: string) {
    const siteUser = await prisma.siteUser.findUnique({
      where: { userId_siteId: { userId, siteId } },
    })
    if (!siteUser) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this site' })
    }
    return siteUser
  }

  async getBalance(itemId: string, locationId: string): Promise<number> {
    const result = await prisma.stockLedgerEntry.aggregate({
      where: { itemId, locationId },
      _sum: { quantityDelta: true },
    })
    return result._sum.quantityDelta ?? 0
  }

  async hasAnyLedgerEntries(itemId: string, locationId: string): Promise<boolean> {
    const count = await prisma.stockLedgerEntry.count({ where: { itemId, locationId } })
    return count > 0
  }

  async create(userId: string, input: CreateStockRecountInput) {
    const siteUser = await this.assertSiteAccess(userId, input.siteId)
    if (siteUser.role === 'VIEWER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })
    }

    const previousQuantity = await this.getBalance(input.itemId, input.locationId)
    const hasHistory = await this.hasAnyLedgerEntries(input.itemId, input.locationId)
    const adjustmentDelta = input.countedQuantity - previousQuantity

    // INITIAL_COUNT when no prior history, RECOUNT_ADJUSTMENT otherwise
    const operationType =
      !hasHistory ? 'INITIAL_COUNT' : 'RECOUNT_ADJUSTMENT'

    const recountId = uuidv4()

    await prisma.$transaction([
      prisma.stockRecount.create({
        data: {
          id: recountId,
          siteId: input.siteId,
          itemId: input.itemId,
          locationId: input.locationId,
          countedQuantity: input.countedQuantity,
          previousQuantity,
          countedAt: new Date(input.countedAt),
          notes: input.notes,
        },
      }),
      prisma.stockLedgerEntry.create({
        data: {
          itemId: input.itemId,
          locationId: input.locationId,
          quantityDelta: adjustmentDelta,
          operationType,
          referenceId: recountId,
        },
      }),
    ])

    return prisma.stockRecount.findUnique({
      where: { id: recountId },
      include: { item: true, location: true },
    })
  }

  async list(userId: string, input: { siteId: string; locationId?: string; itemId?: string }) {
    await this.assertSiteAccess(userId, input.siteId)
    return prisma.stockRecount.findMany({
      where: {
        siteId: input.siteId,
        isDeleted: false,
        ...(input.locationId ? { locationId: input.locationId } : {}),
        ...(input.itemId ? { itemId: input.itemId } : {}),
      },
      include: { item: true, location: true },
      orderBy: { countedAt: 'desc' },
    })
  }
}

export const stockRecountsService = new StockRecountsService()
```

- [ ] **Step 2: Create the router**

```typescript
// server/src/routers/stock/stock-recounts.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import {
  stockRecountsService,
  createStockRecountSchema,
} from '../../services/stock/stock-recounts.service'

export const stockRecountsRouter = router({
  create: protectedProcedure
    .input(createStockRecountSchema)
    .mutation(({ ctx, input }) => stockRecountsService.create(ctx.user.id, input)),

  list: protectedProcedure
    .input(z.object({
      siteId: z.string().uuid(),
      locationId: z.string().uuid().optional(),
      itemId: z.string().uuid().optional(),
    }))
    .query(({ ctx, input }) => stockRecountsService.list(ctx.user.id, input)),
})
```

- [ ] **Step 3: Type-check**

```bash
cd server && npm run tsc
```

Expected: no errors.

---

## Task 8: Stock Levels Service + Router

**Files:**
- Create: `server/src/services/stock/stock-levels.service.ts`
- Create: `server/src/routers/stock/stock-levels.router.ts`

- [ ] **Step 1: Create the service**

```typescript
// server/src/services/stock/stock-levels.service.ts
import { prisma } from '../../db'
import { TRPCError } from '@trpc/server'

class StockLevelsService {
  async assertSiteAccess(userId: string, siteId: string) {
    const siteUser = await prisma.siteUser.findUnique({
      where: { userId_siteId: { userId, siteId } },
    })
    if (!siteUser) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this site' })
    }
    return siteUser
  }

  /**
   * Returns all (item, location, balance) rows for a site.
   * Fetches all items/locations for the site first, then aggregates the ledger.
   */
  async list(userId: string, siteId: string) {
    await this.assertSiteAccess(userId, siteId)

    // Get all items and locations for this site
    const [items, locations] = await Promise.all([
      prisma.stockItem.findMany({ where: { siteId, isDeleted: false } }),
      prisma.stockLocation.findMany({ where: { siteId, isDeleted: false } }),
    ])

    const itemIds = items.map((i) => i.id)
    const locationIds = locations.map((l) => l.id)

    // Aggregate ledger
    const ledger = await prisma.stockLedgerEntry.groupBy({
      by: ['itemId', 'locationId'],
      where: { itemId: { in: itemIds }, locationId: { in: locationIds } },
      _sum: { quantityDelta: true },
    })

    // Build lookup map
    const balanceMap = new Map<string, number>()
    for (const row of ledger) {
      balanceMap.set(`${row.itemId}:${row.locationId}`, row._sum.quantityDelta ?? 0)
    }

    return {
      items,
      locations,
      /** balance[itemId][locationId] = quantity */
      balances: Object.fromEntries(
        items.map((item) => [
          item.id,
          Object.fromEntries(
            locations.map((loc) => [
              loc.id,
              balanceMap.get(`${item.id}:${loc.id}`) ?? 0,
            ])
          ),
        ])
      ),
    }
  }

  /** All items and their quantities at a specific location (for recount flow). */
  async getByLocation(userId: string, locationId: string) {
    const location = await prisma.stockLocation.findFirst({
      where: { id: locationId, isDeleted: false },
      include: { site: { include: { siteUsers: { where: { userId } } } } },
    })
    if (!location || location.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Location not found' })
    }

    const items = await prisma.stockItem.findMany({
      where: { siteId: location.siteId, isDeleted: false, isActive: true },
      orderBy: { name: 'asc' },
    })

    const ledger = await prisma.stockLedgerEntry.groupBy({
      by: ['itemId'],
      where: { locationId, itemId: { in: items.map((i) => i.id) } },
      _sum: { quantityDelta: true },
    })

    const balanceMap = new Map(ledger.map((r) => [r.itemId, r._sum.quantityDelta ?? 0]))

    return items.map((item) => ({
      item,
      balance: balanceMap.get(item.id) ?? 0,
    }))
  }

  /** All locations and their quantities for a specific item. */
  async getByItem(userId: string, itemId: string) {
    const item = await prisma.stockItem.findFirst({
      where: { id: itemId, isDeleted: false },
      include: { site: { include: { siteUsers: { where: { userId } } } } },
    })
    if (!item || item.site.siteUsers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Stock item not found' })
    }

    const locations = await prisma.stockLocation.findMany({
      where: { siteId: item.siteId, isDeleted: false, isActive: true },
      orderBy: { name: 'asc' },
    })

    const ledger = await prisma.stockLedgerEntry.groupBy({
      by: ['locationId'],
      where: { itemId, locationId: { in: locations.map((l) => l.id) } },
      _sum: { quantityDelta: true },
    })

    const balanceMap = new Map(ledger.map((r) => [r.locationId, r._sum.quantityDelta ?? 0]))

    return locations.map((loc) => ({
      location: loc,
      balance: balanceMap.get(loc.id) ?? 0,
    }))
  }
}

export const stockLevelsService = new StockLevelsService()
```

- [ ] **Step 2: Create the router**

```typescript
// server/src/routers/stock/stock-levels.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { stockLevelsService } from '../../services/stock/stock-levels.service'

export const stockLevelsRouter = router({
  list: protectedProcedure
    .input(z.object({ siteId: z.string().uuid() }))
    .query(({ ctx, input }) => stockLevelsService.list(ctx.user.id, input.siteId)),

  getByLocation: protectedProcedure
    .input(z.object({ locationId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      stockLevelsService.getByLocation(ctx.user.id, input.locationId)
    ),

  getByItem: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      stockLevelsService.getByItem(ctx.user.id, input.itemId)
    ),
})
```

- [ ] **Step 3: Type-check**

```bash
cd server && npm run tsc
```

Expected: no errors.

---

## Task 9: Wire Stock Router into appRouter

**Files:**
- Create: `server/src/routers/stock/index.ts`
- Modify: `server/src/routers/appRouter.ts`

- [ ] **Step 1: Create the stock index router**

```typescript
// server/src/routers/stock/index.ts
import { router } from '../../trpc'
import { stockItemsRouter } from './stock-items.router'
import { stockLocationsRouter } from './stock-locations.router'
import { purchaseOrdersRouter } from './purchase-orders.router'
import { stockArrivalsRouter } from './stock-arrivals.router'
import { stockMovementsRouter } from './stock-movements.router'
import { stockRecountsRouter } from './stock-recounts.router'
import { stockLevelsRouter } from './stock-levels.router'

export const stockRouter = router({
  items: stockItemsRouter,
  locations: stockLocationsRouter,
  purchaseOrders: purchaseOrdersRouter,
  arrivals: stockArrivalsRouter,
  movements: stockMovementsRouter,
  recounts: stockRecountsRouter,
  levels: stockLevelsRouter,
})
```

- [ ] **Step 2: Register in appRouter**

In `server/src/routers/appRouter.ts`, add:

```typescript
import { stockRouter } from './stock'
```

And inside the `router({...})` call, add:

```typescript
  // Inventory / Stock management routes
  stock: stockRouter,
```

- [ ] **Step 3: Type-check**

```bash
cd server && npm run tsc
```

Expected: no errors.

- [ ] **Step 4: Commit backend**

```bash
cd server
git add .
git commit -m "feat: add inventory system backend (schema, services, routers)"
```

---

## Task 10: i18n Translations + Routing + Sidebar Nav

**Files:**
- Modify: `webapp/src/i18n/locales/en/translation.ts`
- Modify: `webapp/src/App.tsx`
- Modify: `webapp/src/components/Sidebar.tsx`

- [ ] **Step 1: Add translation keys**

In `webapp/src/i18n/locales/en/translation.ts`, inside the `enTranslation` object, add:

```typescript
  stock: {
    title: 'Stock',
    levels: 'Stock Levels',
    orders: 'Purchase Orders',
    movements: 'Movements',
    recounts: 'Recounts',
    settings: 'Stock Settings',
    items: 'Stock Items',
    locations: 'Locations',
    actions: {
      recordArrival: 'Record Arrival',
      moveStock: 'Move Stock',
      recount: 'Recount',
      newOrder: 'New Order',
      newItem: 'New Item',
      newLocation: 'New Location',
    },
    item: {
      name: 'Item Name',
      unit: 'Unit',
      description: 'Description',
    },
    location: {
      name: 'Location Name',
    },
    order: {
      orderedQuantity: 'Ordered Quantity',
      supplier: 'Supplier',
      orderDate: 'Order Date',
      expectedDelivery: 'Expected Delivery',
      status: {
        OPEN: 'Open',
        PARTIAL: 'Partial',
        COMPLETE: 'Complete',
        CANCELLED: 'Cancelled',
      },
    },
    arrival: {
      quantity: 'Quantity Arrived',
      placedAt: 'Placed At',
    },
    movement: {
      from: 'From',
      to: 'To',
      quantity: 'Quantity',
    },
    recount: {
      expected: 'Expected',
      counted: 'Counted',
      delta: 'Delta',
      initialCount: 'Initial Count',
      progressLabel: '{{done}} / {{total}} items',
    },
  },
```

- [ ] **Step 2: Add routes to App.tsx**

Add imports at top of `webapp/src/App.tsx`:

```typescript
import { StockPage } from '@/pages/stock/StockPage'
import { StockLevels } from '@/pages/stock/StockLevels'
import { PurchaseOrdersPage } from '@/pages/stock/PurchaseOrdersPage'
import { StockSettings } from '@/pages/stock/StockSettings'
```

Add routes inside the `<Route element={<Shell />}>` block:

```tsx
<Route path="/stock" element={<StockPage />} />
<Route path="/stock/levels" element={<StockLevels />} />
<Route path="/stock/orders" element={<PurchaseOrdersPage />} />
<Route path="/stock/settings" element={<StockSettings />} />
```

- [ ] **Step 3: Add Stock to Sidebar**

In `webapp/src/components/Sidebar.tsx`, import the `Warehouse` icon (already in lucide-react):

```typescript
import { ..., Warehouse } from 'lucide-react'
```

Inside the `{sites && sites.length > 0 && currentSite && (...)}` block, add after the floor-plans button:

```tsx
<Button
  variant="ghost"
  className="w-full justify-start"
  onClick={() => handleNavigation('/stock')}
>
  <Warehouse className="h-4 w-4 me-2" />
  {t('stock.title')}
</Button>
```

- [ ] **Step 4: Type-check webapp**

```bash
cd webapp && npm run tsc
```

Expected: errors only for missing page files (that's expected — we'll add them next).

---

## Task 11: StockStepper Component

**Files:**
- Create: `webapp/src/components/stock/StockStepper.tsx`

- [ ] **Step 1: Create the reusable stepper**

```tsx
// webapp/src/components/stock/StockStepper.tsx
import { Button } from '@/components/ui/button'
import { Minus, Plus } from 'lucide-react'

interface StockStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label?: string
  /** Display shown below the number, e.g. "counted so far" */
  sublabel?: string
}

export function StockStepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  label,
  sublabel,
}: StockStepperProps) {
  const decrement = () => onChange(Math.max(min, value - 1))
  const increment = () => onChange(Math.min(max, value + 1))

  return (
    <div className="flex flex-col items-center gap-2">
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <p className="text-7xl font-extrabold tabular-nums leading-none">{value}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      <div className="flex gap-3 mt-2">
        <Button
          variant="outline"
          size="icon"
          className="h-16 w-16 rounded-full border-destructive text-destructive hover:bg-destructive/10"
          onClick={decrement}
          disabled={value <= min}
          aria-label="Decrease"
        >
          <Minus className="h-6 w-6" />
        </Button>
        <Button
          size="icon"
          className="h-16 w-16 rounded-full"
          onClick={increment}
          disabled={value >= max}
          aria-label="Increase"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}
```

---

## Task 12: Stock Home Page (Action-First)

**Files:**
- Create: `webapp/src/pages/stock/StockPage.tsx`

- [ ] **Step 1: Create the action-first home page**

```tsx
// webapp/src/pages/stock/StockPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Warehouse, ArrowRightLeft, ClipboardList, ShoppingCart, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecordArrivalSheet } from '@/components/stock/RecordArrivalSheet'
import { MoveStockSheet } from '@/components/stock/MoveStockSheet'
import { RecountFlow } from '@/components/stock/RecountFlow'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'

export function StockPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentSite } = useCurrentSite()
  const [arrivalOpen, setArrivalOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [recountOpen, setRecountOpen] = useState(false)

  if (!currentSite) return null

  const actions = [
    {
      label: t('stock.actions.recordArrival'),
      icon: ShoppingCart,
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => setArrivalOpen(true),
    },
    {
      label: t('stock.actions.moveStock'),
      icon: ArrowRightLeft,
      color: 'bg-amber-500 hover:bg-amber-600',
      onClick: () => setMoveOpen(true),
    },
    {
      label: t('stock.actions.recount'),
      icon: ClipboardList,
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => setRecountOpen(true),
    },
  ]

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Warehouse className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t('stock.title')}</h1>
      </div>

      {/* Primary actions */}
      <div className="grid gap-4 mb-8">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`flex items-center gap-4 p-5 rounded-xl text-white font-semibold text-lg text-start transition-colors ${action.color}`}
          >
            <action.icon className="h-7 w-7 shrink-0" />
            {action.label}
          </button>
        ))}
      </div>

      {/* Secondary navigation */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t('stock.levels'), path: '/stock/levels' },
          { label: t('stock.orders'), path: '/stock/orders' },
          { label: t('stock.settings'), path: '/stock/settings' },
        ].map((link) => (
          <Button
            key={link.path}
            variant="outline"
            className="h-14 text-sm"
            onClick={() => navigate(link.path)}
          >
            {link.label}
          </Button>
        ))}
      </div>

      <RecordArrivalSheet siteId={currentSite.id} open={arrivalOpen} onOpenChange={setArrivalOpen} />
      <MoveStockSheet siteId={currentSite.id} open={moveOpen} onOpenChange={setMoveOpen} />
      {recountOpen && (
        <RecountFlow siteId={currentSite.id} onClose={() => setRecountOpen(false)} />
      )}
    </div>
  )
}
```

---

## Task 13: Stock Levels Dashboard

**Files:**
- Create: `webapp/src/pages/stock/StockLevels.tsx`

- [ ] **Step 1: Create the matrix dashboard**

```tsx
// webapp/src/pages/stock/StockLevels.tsx
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'

export function StockLevels() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const { data, isLoading } = trpc.stock.levels.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite }
  )

  if (!currentSite) return null
  if (isLoading) return <div className="p-4 text-muted-foreground">Loading…</div>
  if (!data) return null

  const { items, locations, balances } = data

  // Total per item across all locations
  const totals = Object.fromEntries(
    items.map((item) => [
      item.id,
      locations.reduce((sum, loc) => sum + (balances[item.id]?.[loc.id] ?? 0), 0),
    ])
  )

  return (
    <div className="container mx-auto px-4 py-6 overflow-x-auto">
      <h1 className="text-2xl font-bold mb-4">{t('stock.levels')}</h1>

      {items.length === 0 ? (
        <p className="text-muted-foreground">{t('stock.items')} — none yet.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-start py-2 pe-4 font-medium text-muted-foreground">
                {t('stock.item.name')}
              </th>
              {locations.map((loc) => (
                <th key={loc.id} className="py-2 px-3 font-medium text-center">
                  {loc.name}
                </th>
              ))}
              <th className="py-2 px-3 font-medium text-center text-muted-foreground">Σ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-muted/40 transition-colors">
                <td className="py-3 pe-4">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.unit}</p>
                </td>
                {locations.map((loc) => {
                  const qty = balances[item.id]?.[loc.id] ?? 0
                  return (
                    <td
                      key={loc.id}
                      className={`py-3 px-3 text-center font-semibold tabular-nums ${
                        qty === 0 ? 'text-muted-foreground' : ''
                      }`}
                    >
                      {qty}
                    </td>
                  )
                })}
                <td className="py-3 px-3 text-center text-muted-foreground tabular-nums">
                  {totals[item.id]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

---

## Task 14: ItemListSheet Component

**Files:**
- Create: `webapp/src/components/stock/ItemListSheet.tsx`

This bottom sheet appears during recount when the user taps the progress chip. It shows all items with their status (done ✓, current, pending) and lets the user jump to any item.

- [ ] **Step 1: Create the component**

```tsx
// webapp/src/components/stock/ItemListSheet.tsx
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface ItemEntry {
  itemId: string
  itemName: string
  unit: string
  expectedBalance: number
  counted?: number   // undefined = not yet counted
  isCurrent: boolean
}

interface ItemListSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ItemEntry[]
  onSelectItem: (itemId: string) => void
  locationName: string
}

export function ItemListSheet({
  open,
  onOpenChange,
  items,
  onSelectItem,
  locationName,
}: ItemListSheetProps) {
  const { t } = useTranslation()
  const done = items.filter((i) => i.counted !== undefined).length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {locationName} — {t('stock.recount.progressLabel', { done, total: items.length })}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
          {items.map((entry) => {
            const isDone = entry.counted !== undefined
            const delta = isDone ? entry.counted! - entry.expectedBalance : null

            return (
              <button
                key={entry.itemId}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border text-start transition-colors',
                  entry.isCurrent
                    ? 'border-primary bg-primary/10'
                    : isDone
                    ? 'border-green-500/40 bg-green-500/5'
                    : 'border-border hover:bg-muted/50'
                )}
                onClick={() => {
                  onSelectItem(entry.itemId)
                  onOpenChange(false)
                }}
              >
                <div>
                  <p className={cn('font-medium', entry.isCurrent && 'text-primary')}>
                    {entry.itemName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isDone
                      ? `${t('stock.recount.counted')}: ${entry.counted} · ${t('stock.recount.expected')}: ${entry.expectedBalance}`
                      : `${t('stock.recount.expected')}: ${entry.expectedBalance} ${entry.unit}`}
                  </p>
                </div>
                <div className="shrink-0 ms-3">
                  {entry.isCurrent ? (
                    <span className="text-xs font-bold text-primary">NOW</span>
                  ) : isDone ? (
                    <div className="flex items-center gap-1">
                      {delta !== null && delta !== 0 && (
                        <span className={cn('text-xs font-semibold', delta < 0 ? 'text-destructive' : 'text-green-600')}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      )}
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">→</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

---

## Task 15: RecountFlow Component

**Files:**
- Create: `webapp/src/components/stock/RecountFlow.tsx`

- [ ] **Step 1: Create the component**

```tsx
// webapp/src/components/stock/RecountFlow.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { StockStepper } from './StockStepper'
import { ItemListSheet } from './ItemListSheet'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface RecountFlowProps {
  siteId: string
  onClose: () => void
}

type CountedMap = Record<string, number> // itemId → counted quantity

export function RecountFlow({ siteId, onClose }: RecountFlowProps) {
  const { t } = useTranslation()
  const [locationId, setLocationId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [counted, setCounted] = useState<CountedMap>({})
  const [listOpen, setListOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { data: locations } = trpc.stock.locations.list.useQuery({ siteId })
  const { data: levelsByLocation } = trpc.stock.levels.getByLocation.useQuery(
    { locationId: locationId ?? '' },
    { enabled: !!locationId }
  )

  const createRecount = trpc.stock.recounts.create.useMutation()
  const utils = trpc.useUtils()

  const items = levelsByLocation ?? []
  const selectedLocation = locations?.find((l) => l.id === locationId)
  const currentItem = items[currentIndex]

  const handleCount = (value: number) => {
    if (!currentItem) return
    setCounted((prev) => ({ ...prev, [currentItem.item.id]: value }))
  }

  const handleNext = () => {
    if (currentIndex < items.length - 1) setCurrentIndex((i) => i + 1)
  }

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
  }

  const handleJump = (itemId: string) => {
    const idx = items.findIndex((e) => e.item.id === itemId)
    if (idx >= 0) setCurrentIndex(idx)
  }

  const handleSubmit = async () => {
    if (!locationId) return
    const now = new Date().toISOString()
    await Promise.all(
      Object.entries(counted).map(([itemId, countedQuantity]) =>
        createRecount.mutateAsync({
          siteId,
          itemId,
          locationId,
          countedQuantity,
          countedAt: now,
        })
      )
    )
    await utils.stock.levels.list.invalidate({ siteId })
    setSubmitted(true)
  }

  const doneCount = Object.keys(counted).length
  const allDone = doneCount === items.length && items.length > 0

  // Step 1: location selection
  if (!locationId) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('stock.actions.recount')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">{t('stock.location.name')}</p>
          <Select onValueChange={setLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="Select location…" />
            </SelectTrigger>
            <SelectContent>
              {locations?.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>
    )
  }

  // Step 3: done confirmation
  if (submitted) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Recount saved ✓</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            {doneCount} item{doneCount !== 1 ? 's' : ''} updated at {selectedLocation?.name}.
          </p>
          <Button onClick={onClose}>Done</Button>
        </DialogContent>
      </Dialog>
    )
  }

  // Step 2: item-by-item counting
  if (!currentItem) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <p className="text-muted-foreground text-sm">No active stock items at this location.</p>
          <Button variant="outline" onClick={onClose} className="mt-4">Close</Button>
        </DialogContent>
      </Dialog>
    )
  }

  const expectedBalance = currentItem.balance
  const currentCounted = counted[currentItem.item.id] ?? 0
  const delta = currentCounted - expectedBalance

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm flex flex-col gap-0 p-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-xs text-muted-foreground">📍 {selectedLocation?.name}</span>
            <button
              className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary"
              onClick={() => setListOpen(true)}
            >
              {doneCount} / {items.length} {t('stock.items').toLowerCase()} ▾
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted mx-4 rounded-full mb-4">
            <div
              className="h-1 bg-primary rounded-full transition-all"
              style={{ width: `${(doneCount / items.length) * 100}%` }}
            />
          </div>

          {/* Item info */}
          <div className="text-center px-4 mb-2">
            <p className="text-xl font-bold">{currentItem.item.name}</p>
            <p className="text-sm text-muted-foreground">
              {t('stock.recount.expected')}: <span className="font-semibold text-amber-500">{expectedBalance}</span> {currentItem.item.unit}
            </p>
          </div>

          {/* Stepper */}
          <div className="px-4 py-2">
            <StockStepper
              value={currentCounted}
              onChange={handleCount}
              sublabel={t('stock.recount.counted').toLowerCase()}
            />
          </div>

          {/* Delta */}
          <div className="mx-4 mb-4 px-3 py-2 bg-muted rounded-lg text-center text-sm">
            {delta === 0 ? (
              <span className="text-muted-foreground">No change</span>
            ) : (
              <span className={delta < 0 ? 'text-destructive font-semibold' : 'text-green-600 font-semibold'}>
                {delta > 0 ? '+' : ''}{delta} vs expected
              </span>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-2 px-4 pb-4">
            <Button variant="outline" size="sm" onClick={handleBack} disabled={currentIndex === 0}>
              ← Back
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext} disabled={currentIndex === items.length - 1} className="flex-1">
              Skip
            </Button>
            {currentIndex < items.length - 1 ? (
              <Button size="sm" onClick={handleNext} className="flex-1">
                Next →
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={doneCount === 0 || createRecount.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {createRecount.isPending ? 'Saving…' : 'Submit'}
              </Button>
            )}
          </div>

          {/* Early submit */}
          {!allDone && doneCount > 0 && (
            <div className="px-4 pb-3 text-center">
              <button
                className="text-xs text-muted-foreground underline"
                onClick={handleSubmit}
                disabled={createRecount.isPending}
              >
                Submit {doneCount} counted item{doneCount !== 1 ? 's' : ''} now
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ItemListSheet
        open={listOpen}
        onOpenChange={setListOpen}
        locationName={selectedLocation?.name ?? ''}
        items={items.map((entry, idx) => ({
          itemId: entry.item.id,
          itemName: entry.item.name,
          unit: entry.item.unit,
          expectedBalance: entry.balance,
          counted: counted[entry.item.id],
          isCurrent: idx === currentIndex,
        }))}
        onSelectItem={handleJump}
      />
    </>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd webapp && npm run tsc
```

Expected: errors only for missing `RecordArrivalSheet` and `MoveStockSheet` (next tasks).

---

## Task 16: RecordArrivalSheet Component

**Files:**
- Create: `webapp/src/components/stock/RecordArrivalSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
// webapp/src/components/stock/RecordArrivalSheet.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { StockStepper } from './StockStepper'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface RecordArrivalSheetProps {
  siteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecordArrivalSheet({ siteId, open, onOpenChange }: RecordArrivalSheetProps) {
  const { t } = useTranslation()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(0)

  const { data: orders } = trpc.stock.purchaseOrders.list.useQuery(
    { siteId, status: 'OPEN' },
    { enabled: open }
  )
  const { data: partialOrders } = trpc.stock.purchaseOrders.list.useQuery(
    { siteId, status: 'PARTIAL' },
    { enabled: open }
  )
  const { data: locations } = trpc.stock.locations.list.useQuery(
    { siteId },
    { enabled: open }
  )

  const selectedOrder = [...(orders ?? []), ...(partialOrders ?? [])].find(
    (o) => o.id === selectedOrderId
  )

  const alreadyReceived = selectedOrder?.arrivals.reduce((s, a) => s + a.quantity, 0) ?? 0
  const remaining = selectedOrder ? selectedOrder.orderedQuantity - alreadyReceived : 0

  const createArrival = trpc.stock.arrivals.create.useMutation()
  const utils = trpc.useUtils()

  const allOrders = [...(orders ?? []), ...(partialOrders ?? [])]

  const handleConfirm = async () => {
    if (!selectedOrderId || !locationId || quantity <= 0) return
    await createArrival.mutateAsync({
      purchaseOrderId: selectedOrderId,
      locationId,
      quantity,
      arrivedAt: new Date().toISOString(),
    })
    await utils.stock.purchaseOrders.list.invalidate({ siteId })
    await utils.stock.levels.list.invalidate({ siteId })
    onOpenChange(false)
    setSelectedOrderId(null)
    setLocationId(null)
    setQuantity(0)
  }

  const newStatus =
    selectedOrder && quantity > 0
      ? alreadyReceived + quantity >= selectedOrder.orderedQuantity
        ? 'COMPLETE'
        : 'PARTIAL'
      : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col gap-4 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('stock.actions.recordArrival')}</SheetTitle>
        </SheetHeader>

        {/* Order selector */}
        <div>
          <p className="text-sm font-medium mb-2">{t('stock.orders')}</p>
          <Select onValueChange={setSelectedOrderId}>
            <SelectTrigger>
              <SelectValue placeholder="Select purchase order…" />
            </SelectTrigger>
            <SelectContent>
              {allOrders.map((order) => (
                <SelectItem key={order.id} value={order.id}>
                  {order.item.name} — {order.orderedQuantity} {order.item.unit} ({order.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedOrder && (
          <>
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="font-medium">{selectedOrder.item.name}</p>
              {selectedOrder.supplierName && (
                <p className="text-muted-foreground">Supplier: {selectedOrder.supplierName}</p>
              )}
              <p className="text-muted-foreground">
                Ordered: {selectedOrder.orderedQuantity} · Received: {alreadyReceived} · Outstanding: {remaining}
              </p>
            </div>

            {/* Location selector */}
            <div>
              <p className="text-sm font-medium mb-2">{t('stock.arrival.placedAt')}</p>
              <Select onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location…" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stepper */}
            <StockStepper
              value={quantity}
              onChange={setQuantity}
              max={remaining}
              sublabel={t('stock.arrival.quantity').toLowerCase()}
            />

            {/* Status preview */}
            {quantity > 0 && newStatus && (
              <div className={`text-sm text-center px-3 py-2 rounded-lg ${
                newStatus === 'COMPLETE' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'
              }`}>
                {remaining - quantity > 0
                  ? `⚠ ${remaining - quantity} still outstanding → order stays PARTIAL`
                  : '✓ Order will be marked COMPLETE'}
              </div>
            )}

            <Button
              onClick={handleConfirm}
              disabled={!locationId || quantity <= 0 || createArrival.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {createArrival.isPending ? 'Saving…' : 'Confirm Arrival'}
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

---

## Task 17: MoveStockSheet Component

**Files:**
- Create: `webapp/src/components/stock/MoveStockSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
// webapp/src/components/stock/MoveStockSheet.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { trpc } from '@/utils/trpc'
import { StockStepper } from './StockStepper'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface MoveStockSheetProps {
  siteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MoveStockSheet({ siteId, open, onOpenChange }: MoveStockSheetProps) {
  const { t } = useTranslation()
  const [itemId, setItemId] = useState<string | null>(null)
  const [fromLocationId, setFromLocationId] = useState<string | null>(null)
  const [toLocationId, setToLocationId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(0)

  const { data: items } = trpc.stock.items.list.useQuery({ siteId }, { enabled: open })
  const { data: levels } = trpc.stock.levels.list.useQuery({ siteId }, { enabled: open })

  const locations = levels?.locations ?? []

  const fromBalance =
    itemId && fromLocationId
      ? (levels?.balances[itemId]?.[fromLocationId] ?? 0)
      : null

  const toBalance =
    itemId && toLocationId
      ? (levels?.balances[itemId]?.[toLocationId] ?? 0)
      : null

  const createMovement = trpc.stock.movements.create.useMutation()
  const utils = trpc.useUtils()

  const handleConfirm = async () => {
    if (!itemId || !fromLocationId || !toLocationId || quantity <= 0) return
    await createMovement.mutateAsync({
      siteId,
      itemId,
      fromLocationId,
      toLocationId,
      quantity,
      movedAt: new Date().toISOString(),
    })
    await utils.stock.levels.list.invalidate({ siteId })
    onOpenChange(false)
    setItemId(null)
    setFromLocationId(null)
    setToLocationId(null)
    setQuantity(0)
  }

  const afterFrom = fromBalance !== null ? fromBalance - quantity : null
  const afterTo = toBalance !== null ? toBalance + quantity : null
  const insufficientStock = fromBalance !== null && quantity > fromBalance

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col gap-4 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('stock.actions.moveStock')}</SheetTitle>
        </SheetHeader>

        {/* Item */}
        <div>
          <p className="text-sm font-medium mb-2">{t('stock.item.name')}</p>
          <Select onValueChange={setItemId}>
            <SelectTrigger>
              <SelectValue placeholder="Select item…" />
            </SelectTrigger>
            <SelectContent>
              {items?.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* From / To */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <p className="text-sm font-medium mb-2">{t('stock.movement.from')}</p>
            <Select onValueChange={setFromLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="From…" />
              </SelectTrigger>
              <SelectContent>
                {locations
                  .filter((l) => l.id !== toLocationId)
                  .map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                      {itemId && ` (${levels?.balances[itemId]?.[loc.id] ?? 0})`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground mt-5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium mb-2">{t('stock.movement.to')}</p>
            <Select onValueChange={setToLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="To…" />
              </SelectTrigger>
              <SelectContent>
                {locations
                  .filter((l) => l.id !== fromLocationId)
                  .map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stepper */}
        {fromBalance !== null && (
          <StockStepper
            value={quantity}
            onChange={setQuantity}
            max={fromBalance}
            sublabel={t('stock.movement.quantity').toLowerCase()}
          />
        )}

        {/* After-state preview */}
        {quantity > 0 && fromBalance !== null && toBalance !== null && (
          <div className={`flex justify-around text-sm px-3 py-2 rounded-lg ${
            insufficientStock ? 'bg-destructive/10 text-destructive' : 'bg-muted'
          }`}>
            {insufficientStock ? (
              <span>Not enough stock at source ({fromBalance} available)</span>
            ) : (
              <>
                <span>{locations.find(l => l.id === fromLocationId)?.name}: <b>{afterFrom}</b></span>
                <span>{locations.find(l => l.id === toLocationId)?.name}: <b>{afterTo}</b></span>
              </>
            )}
          </div>
        )}

        <Button
          onClick={handleConfirm}
          disabled={
            !itemId || !fromLocationId || !toLocationId ||
            quantity <= 0 || insufficientStock || createMovement.isPending
          }
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          {createMovement.isPending ? 'Saving…' : 'Log Movement'}
        </Button>
      </SheetContent>
    </Sheet>
  )
}
```

---

## Task 18: Purchase Orders Page + Stock Settings Page

**Files:**
- Create: `webapp/src/pages/stock/PurchaseOrdersPage.tsx`
- Create: `webapp/src/pages/stock/StockSettings.tsx`

- [ ] **Step 1: Create Purchase Orders page**

```tsx
// webapp/src/pages/stock/PurchaseOrdersPage.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { inferRouterInputs } from '@trpc/server'
import type { AppRouter } from '../../../../server/src/routers/appRouter'

type RouterInput = inferRouterInputs<AppRouter>
type CreateOrderInput = RouterInput['stock']['purchaseOrders']['create']

const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-500/20 text-blue-600',
  PARTIAL: 'bg-amber-500/20 text-amber-600',
  COMPLETE: 'bg-green-500/20 text-green-600',
  CANCELLED: 'bg-muted text-muted-foreground',
}

export function PurchaseOrdersPage() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<Partial<CreateOrderInput>>({})

  const { data: orders, refetch } = trpc.stock.purchaseOrders.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite }
  )
  const { data: items } = trpc.stock.items.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite && sheetOpen }
  )

  const createOrder = trpc.stock.purchaseOrders.create.useMutation()

  const handleCreate = async () => {
    if (!currentSite || !form.itemId || !form.orderedQuantity || !form.orderDate) return
    await createOrder.mutateAsync({
      siteId: currentSite.id,
      itemId: form.itemId,
      orderedQuantity: Number(form.orderedQuantity),
      supplierName: form.supplierName,
      orderDate: new Date(form.orderDate).toISOString(),
    })
    await refetch()
    setSheetOpen(false)
    setForm({})
  }

  if (!currentSite) return null

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t('stock.orders')}</h1>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          + {t('stock.actions.newOrder')}
        </Button>
      </div>

      <div className="space-y-3">
        {orders?.map((order) => {
          const received = order.arrivals.reduce((s, a) => s + a.quantity, 0)
          return (
            <div key={order.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{order.item.name}</p>
                  {order.supplierName && (
                    <p className="text-xs text-muted-foreground">{order.supplierName}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Ordered: {order.orderedQuantity} · Received: {received}
                  </p>
                </div>
                <Badge className={statusColors[order.status]}>
                  {t(`stock.order.status.${order.status}`)}
                </Badge>
              </div>
            </div>
          )
        })}
        {orders?.length === 0 && (
          <p className="text-muted-foreground text-sm">No purchase orders yet.</p>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[70vh] overflow-y-auto flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>{t('stock.actions.newOrder')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('stock.item.name')}</Label>
              <Select onValueChange={(v) => setForm((f) => ({ ...f, itemId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
                <SelectContent>
                  {items?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('stock.order.orderedQuantity')}</Label>
              <Input
                type="number"
                placeholder="e.g. 50"
                onChange={(e) => setForm((f) => ({ ...f, orderedQuantity: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>{t('stock.order.supplier')}</Label>
              <Input
                placeholder="Supplier name (optional)"
                onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('stock.order.orderDate')}</Label>
              <Input
                type="date"
                onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={createOrder.isPending || !form.itemId || !form.orderedQuantity || !form.orderDate}
              className="w-full"
            >
              {createOrder.isPending ? 'Saving…' : 'Create Order'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
```

- [ ] **Step 2: Create Stock Settings page**

```tsx
// webapp/src/pages/stock/StockSettings.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/utils/trpc'
import { useCurrentSite } from '@/contexts/CurrentSiteContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export function StockSettings() {
  const { t } = useTranslation()
  const { currentSite } = useCurrentSite()
  const [itemSheetOpen, setItemSheetOpen] = useState(false)
  const [locationSheetOpen, setLocationSheetOpen] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [newLocationName, setNewLocationName] = useState('')

  const { data: items, refetch: refetchItems } = trpc.stock.items.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite }
  )
  const { data: locations, refetch: refetchLocations } = trpc.stock.locations.list.useQuery(
    { siteId: currentSite?.id ?? '' },
    { enabled: !!currentSite }
  )

  const createItem = trpc.stock.items.create.useMutation()
  const createLocation = trpc.stock.locations.create.useMutation()

  const handleCreateItem = async () => {
    if (!currentSite || !newItemName || !newItemUnit) return
    await createItem.mutateAsync({ siteId: currentSite.id, name: newItemName, unit: newItemUnit })
    await refetchItems()
    setItemSheetOpen(false)
    setNewItemName('')
    setNewItemUnit('')
  }

  const handleCreateLocation = async () => {
    if (!currentSite || !newLocationName) return
    await createLocation.mutateAsync({ siteId: currentSite.id, name: newLocationName })
    await refetchLocations()
    setLocationSheetOpen(false)
    setNewLocationName('')
  }

  if (!currentSite) return null

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-4">{t('stock.settings')}</h1>

      <Tabs defaultValue="items">
        <TabsList className="w-full">
          <TabsTrigger value="items" className="flex-1">{t('stock.items')}</TabsTrigger>
          <TabsTrigger value="locations" className="flex-1">{t('stock.locations')}</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setItemSheetOpen(true)}>
              + {t('stock.actions.newItem')}
            </Button>
          </div>
          <div className="space-y-2">
            {items?.map((item) => (
              <div key={item.id} className="border rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="locations" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setLocationSheetOpen(true)}>
              + {t('stock.actions.newLocation')}
            </Button>
          </div>
          <div className="space-y-2">
            {locations?.map((loc) => (
              <div key={loc.id} className="border rounded-lg px-4 py-3">
                <p className="font-medium">{loc.name}</p>
                {loc.description && <p className="text-xs text-muted-foreground">{loc.description}</p>}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Item Sheet */}
      <Sheet open={itemSheetOpen} onOpenChange={setItemSheetOpen}>
        <SheetContent side="bottom" className="h-[50vh] flex flex-col gap-4">
          <SheetHeader><SheetTitle>{t('stock.actions.newItem')}</SheetTitle></SheetHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('stock.item.name')}</Label>
              <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g. Coca-Cola 1.5L" />
            </div>
            <div>
              <Label>{t('stock.item.unit')}</Label>
              <Input value={newItemUnit} onChange={(e) => setNewItemUnit(e.target.value)} placeholder="e.g. bottle, crate, can" />
            </div>
            <Button onClick={handleCreateItem} disabled={!newItemName || !newItemUnit || createItem.isPending} className="w-full">
              {createItem.isPending ? 'Saving…' : 'Add Item'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* New Location Sheet */}
      <Sheet open={locationSheetOpen} onOpenChange={setLocationSheetOpen}>
        <SheetContent side="bottom" className="h-[40vh] flex flex-col gap-4">
          <SheetHeader><SheetTitle>{t('stock.actions.newLocation')}</SheetTitle></SheetHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('stock.location.name')}</Label>
              <Input value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} placeholder="e.g. Main Warehouse, Bar A" />
            </div>
            <Button onClick={handleCreateLocation} disabled={!newLocationName || createLocation.isPending} className="w-full">
              {createLocation.isPending ? 'Saving…' : 'Add Location'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
```

- [ ] **Step 3: Final type-check — both server and webapp**

```bash
cd server && npm run tsc
cd ../webapp && npm run tsc
```

Expected: no errors in either.

- [ ] **Step 4: Final commit**

```bash
cd ..
git add .
git commit -m "feat: add inventory system frontend (stock pages, stepper, recount flow, arrival/movement sheets)"
```

---

## Self-Review Checklist

### Spec Coverage
| Spec Requirement | Task |
|---|---|
| StockItem catalog | Task 1, 2 |
| StockLocation | Task 1, 3 |
| PurchaseOrder (OPEN/PARTIAL/COMPLETE/CANCELLED) | Task 1, 4 |
| StockArrival atomic with ledger + PO status update | Task 5 |
| StockMovement atomic with two ledger entries | Task 6 |
| StockRecount atomic with INITIAL_COUNT/RECOUNT_ADJUSTMENT | Task 7 |
| StockLedgerEntry single source of truth | Task 1, 5–8 |
| Balance via groupBy._sum | Task 8 |
| 7 tRPC routers wired to appRouter | Tasks 2–9 |
| Mobile stepper (+/−) input | Task 11 |
| Action-first home screen | Task 12 |
| Matrix levels dashboard | Task 13 |
| Item list sheet (jump between items) | Task 14 |
| Recount flow (item-by-item, progress chip) | Task 15 |
| Record arrival (partial delivery warning) | Task 16 |
| Move stock (after-state preview, stock validation) | Task 17 |
| Purchase orders page | Task 18 |
| Stock settings (items + locations CRUD) | Task 18 |
| Sidebar nav + routes | Task 10 |
| i18n translations | Task 10 |

All spec requirements covered. ✅

### Type Consistency
- `stockLevelsService.list()` returns `{ items, locations, balances }` — `StockLevels.tsx` and `MoveStockSheet.tsx` both destructure this shape. ✅
- `stockLevelsService.getByLocation()` returns `Array<{ item, balance }>` — `RecountFlow.tsx` maps over `levelsByLocation` with `.item` and `.balance`. ✅
- `createStockRecountSchema` uses `countedQuantity` — `RecountFlow.tsx` calls `createRecount.mutateAsync({ countedQuantity })`. ✅
- All router keys: `stock.items`, `stock.locations`, `stock.purchaseOrders`, `stock.arrivals`, `stock.movements`, `stock.recounts`, `stock.levels` — consistent across all frontend components. ✅
