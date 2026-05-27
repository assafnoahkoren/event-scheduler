-- CreateEnum
CREATE TYPE "public"."PurchaseOrderStatus" AS ENUM ('OPEN', 'PARTIAL', 'COMPLETE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."LedgerEntryType" AS ENUM ('ARRIVAL', 'MOVEMENT_IN', 'MOVEMENT_OUT', 'INITIAL_COUNT', 'RECOUNT_ADJUSTMENT');

-- CreateTable
CREATE TABLE "public"."purchase_orders" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "ordered_quantity" DOUBLE PRECISION NOT NULL,
    "status" "public"."PurchaseOrderStatus" NOT NULL DEFAULT 'OPEN',
    "supplier_name" TEXT,
    "notes" TEXT,
    "order_date" TIMESTAMP(3) NOT NULL,
    "expected_delivery_date" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_arrivals" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "arrived_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_arrivals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_items" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_ledger_entries" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "quantity_delta" DOUBLE PRECISION NOT NULL,
    "operation_type" "public"."LedgerEntryType" NOT NULL,
    "reference_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_locations" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_movements" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "from_location_id" TEXT NOT NULL,
    "to_location_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "moved_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_recounts" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "counted_quantity" DOUBLE PRECISION NOT NULL,
    "previous_quantity" DOUBLE PRECISION NOT NULL,
    "counted_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_recounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_orders_site_id_idx" ON "public"."purchase_orders"("site_id");

-- CreateIndex
CREATE INDEX "purchase_orders_is_deleted_idx" ON "public"."purchase_orders"("is_deleted");

-- CreateIndex
CREATE INDEX "purchase_orders_site_id_status_idx" ON "public"."purchase_orders"("site_id", "status");

-- CreateIndex
CREATE INDEX "stock_arrivals_purchase_order_id_idx" ON "public"."stock_arrivals"("purchase_order_id");

-- CreateIndex
CREATE INDEX "stock_arrivals_location_id_idx" ON "public"."stock_arrivals"("location_id");

-- CreateIndex
CREATE INDEX "stock_arrivals_is_deleted_idx" ON "public"."stock_arrivals"("is_deleted");

-- CreateIndex
CREATE INDEX "stock_items_site_id_idx" ON "public"."stock_items"("site_id");

-- CreateIndex
CREATE INDEX "stock_items_is_deleted_idx" ON "public"."stock_items"("is_deleted");

-- CreateIndex
CREATE INDEX "stock_items_site_id_is_deleted_idx" ON "public"."stock_items"("site_id", "is_deleted");

-- CreateIndex
CREATE INDEX "stock_ledger_entries_item_id_location_id_idx" ON "public"."stock_ledger_entries"("item_id", "location_id");

-- CreateIndex
CREATE INDEX "stock_ledger_entries_location_id_idx" ON "public"."stock_ledger_entries"("location_id");

-- CreateIndex
CREATE INDEX "stock_ledger_entries_item_id_idx" ON "public"."stock_ledger_entries"("item_id");

-- CreateIndex
CREATE INDEX "stock_locations_site_id_idx" ON "public"."stock_locations"("site_id");

-- CreateIndex
CREATE INDEX "stock_locations_is_deleted_idx" ON "public"."stock_locations"("is_deleted");

-- CreateIndex
CREATE INDEX "stock_locations_site_id_is_deleted_idx" ON "public"."stock_locations"("site_id", "is_deleted");

-- CreateIndex
CREATE INDEX "stock_movements_site_id_idx" ON "public"."stock_movements"("site_id");

-- CreateIndex
CREATE INDEX "stock_movements_item_id_idx" ON "public"."stock_movements"("item_id");

-- CreateIndex
CREATE INDEX "stock_movements_from_location_id_idx" ON "public"."stock_movements"("from_location_id");

-- CreateIndex
CREATE INDEX "stock_movements_to_location_id_idx" ON "public"."stock_movements"("to_location_id");

-- CreateIndex
CREATE INDEX "stock_movements_is_deleted_idx" ON "public"."stock_movements"("is_deleted");

-- CreateIndex
CREATE INDEX "stock_recounts_site_id_idx" ON "public"."stock_recounts"("site_id");

-- CreateIndex
CREATE INDEX "stock_recounts_item_id_idx" ON "public"."stock_recounts"("item_id");

-- CreateIndex
CREATE INDEX "stock_recounts_location_id_idx" ON "public"."stock_recounts"("location_id");

-- CreateIndex
CREATE INDEX "stock_recounts_is_deleted_idx" ON "public"."stock_recounts"("is_deleted");

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_arrivals" ADD CONSTRAINT "stock_arrivals_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_arrivals" ADD CONSTRAINT "stock_arrivals_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."stock_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_items" ADD CONSTRAINT "stock_items_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."stock_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_locations" ADD CONSTRAINT "stock_locations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "public"."stock_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "public"."stock_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_recounts" ADD CONSTRAINT "stock_recounts_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_recounts" ADD CONSTRAINT "stock_recounts_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_recounts" ADD CONSTRAINT "stock_recounts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."stock_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
