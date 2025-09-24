/*
  Warnings:

  - Added the required column `name` to the `service_provider_services` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."service_provider_services" DROP CONSTRAINT "service_provider_services_category_id_fkey";

-- DropIndex
DROP INDEX "public"."service_provider_services_provider_id_category_id_key";

-- AlterTable
ALTER TABLE "public"."service_provider_services" ADD COLUMN     "name" TEXT NOT NULL,
ALTER COLUMN "category_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."service_provider_services" ADD CONSTRAINT "service_provider_services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
