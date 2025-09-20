-- DropIndex
DROP INDEX "public"."event_products_event_id_product_id_key";

-- CreateIndex
CREATE INDEX "event_products_event_id_product_id_idx" ON "public"."event_products"("event_id", "product_id");
