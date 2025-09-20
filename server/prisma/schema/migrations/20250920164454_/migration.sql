-- CreateEnum
CREATE TYPE "public"."ProductType" AS ENUM ('SERVICE', 'PHYSICAL', 'EXTERNAL_SERVICE');

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."ProductType" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_products" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION,
    "currency" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_site_id_idx" ON "public"."products"("site_id");

-- CreateIndex
CREATE INDEX "products_is_deleted_idx" ON "public"."products"("is_deleted");

-- CreateIndex
CREATE INDEX "products_site_id_is_deleted_idx" ON "public"."products"("site_id", "is_deleted");

-- CreateIndex
CREATE INDEX "event_products_event_id_idx" ON "public"."event_products"("event_id");

-- CreateIndex
CREATE INDEX "event_products_product_id_idx" ON "public"."event_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_products_event_id_product_id_key" ON "public"."event_products"("event_id", "product_id");

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_products" ADD CONSTRAINT "event_products_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_products" ADD CONSTRAINT "event_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
