-- Data migration: restructure purchase orders to support multiple items per order
-- Run BEFORE prisma db push --accept-data-loss

-- Step 1: Create purchase_order_lines table
CREATE TABLE IF NOT EXISTS "purchase_order_lines" (
  "id"                TEXT                  NOT NULL PRIMARY KEY,
  "purchase_order_id" TEXT                  NOT NULL,
  "item_id"           TEXT                  NOT NULL,
  "ordered_quantity"  DOUBLE PRECISION      NOT NULL,
  "status"            "PurchaseOrderStatus" NOT NULL DEFAULT 'OPEN',
  "is_deleted"        BOOLEAN               NOT NULL DEFAULT false,
  "deleted_at"        TIMESTAMP(3),
  "created_at"        TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_order_lines_purchase_order_id_fkey"
    FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "purchase_order_lines_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "stock_items"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "purchase_order_lines_purchase_order_id_idx"
  ON "purchase_order_lines"("purchase_order_id");
CREATE INDEX IF NOT EXISTS "purchase_order_lines_is_deleted_idx"
  ON "purchase_order_lines"("is_deleted");

-- Step 2: Migrate existing orders → one line per order
INSERT INTO "purchase_order_lines"
  ("id", "purchase_order_id", "item_id", "ordered_quantity", "status",
   "is_deleted", "deleted_at", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  "id",
  "item_id",
  "ordered_quantity",
  "status",
  "is_deleted",
  "deleted_at",
  "created_at",
  CURRENT_TIMESTAMP
FROM "purchase_orders";

-- Step 3: Add nullable column to stock_arrivals so we can populate it
ALTER TABLE "stock_arrivals"
  ADD COLUMN IF NOT EXISTS "purchase_order_line_id" TEXT;

-- Step 4: Populate from the lines we just created
UPDATE "stock_arrivals" sa
SET "purchase_order_line_id" = pol."id"
FROM "purchase_order_lines" pol
WHERE pol."purchase_order_id" = sa."purchase_order_id";

-- Step 5: Enforce NOT NULL now that all rows are populated
ALTER TABLE "stock_arrivals"
  ALTER COLUMN "purchase_order_line_id" SET NOT NULL;

-- Step 6: Add FK constraint for the new column
ALTER TABLE "stock_arrivals"
  ADD CONSTRAINT "stock_arrivals_purchase_order_line_id_fkey"
  FOREIGN KEY ("purchase_order_line_id")
  REFERENCES "purchase_order_lines"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
