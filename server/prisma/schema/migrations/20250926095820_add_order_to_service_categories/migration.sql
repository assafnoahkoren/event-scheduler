-- AlterTable
ALTER TABLE "public"."service_categories" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "service_categories_organization_id_order_idx" ON "public"."service_categories"("organization_id", "order");
