-- AlterTable
ALTER TABLE "public"."event_products" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "event_products_is_deleted_idx" ON "public"."event_products"("is_deleted");

-- CreateIndex
CREATE INDEX "event_products_event_id_is_deleted_idx" ON "public"."event_products"("event_id", "is_deleted");
