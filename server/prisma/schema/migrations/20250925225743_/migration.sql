-- AlterTable
ALTER TABLE "public"."service_providers" ADD COLUMN     "category_id" TEXT;

-- CreateIndex
CREATE INDEX "service_providers_category_id_idx" ON "public"."service_providers"("category_id");

-- AddForeignKey
ALTER TABLE "public"."service_providers" ADD CONSTRAINT "service_providers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
