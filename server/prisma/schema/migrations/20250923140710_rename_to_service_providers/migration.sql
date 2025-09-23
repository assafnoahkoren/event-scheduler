/*
  Warnings:

  - You are about to drop the `constructor_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `constructor_services` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `constructors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `event_constructors` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."constructor_services" DROP CONSTRAINT "constructor_services_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."constructor_services" DROP CONSTRAINT "constructor_services_constructor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."event_constructors" DROP CONSTRAINT "event_constructors_constructor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."event_constructors" DROP CONSTRAINT "event_constructors_constructor_service_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."event_constructors" DROP CONSTRAINT "event_constructors_event_id_fkey";

-- DropTable
DROP TABLE "public"."constructor_categories";

-- DropTable
DROP TABLE "public"."constructor_services";

-- DropTable
DROP TABLE "public"."constructors";

-- DropTable
DROP TABLE "public"."event_constructors";

-- CreateTable
CREATE TABLE "public"."service_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_provider_services" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "currency" TEXT,
    "fileLinks" TEXT[],
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_provider_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_providers" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "provider_service_id" TEXT NOT NULL,
    "agreed_price" DOUBLE PRECISION,
    "currency" TEXT,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),
    "payment_notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_name_key" ON "public"."service_categories"("name");

-- CreateIndex
CREATE INDEX "service_categories_is_deleted_idx" ON "public"."service_categories"("is_deleted");

-- CreateIndex
CREATE INDEX "service_providers_is_deleted_idx" ON "public"."service_providers"("is_deleted");

-- CreateIndex
CREATE INDEX "service_providers_name_idx" ON "public"."service_providers"("name");

-- CreateIndex
CREATE INDEX "service_provider_services_provider_id_idx" ON "public"."service_provider_services"("provider_id");

-- CreateIndex
CREATE INDEX "service_provider_services_category_id_idx" ON "public"."service_provider_services"("category_id");

-- CreateIndex
CREATE INDEX "service_provider_services_is_deleted_idx" ON "public"."service_provider_services"("is_deleted");

-- CreateIndex
CREATE INDEX "service_provider_services_provider_id_is_deleted_idx" ON "public"."service_provider_services"("provider_id", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_services_provider_id_category_id_key" ON "public"."service_provider_services"("provider_id", "category_id");

-- CreateIndex
CREATE INDEX "event_providers_event_id_idx" ON "public"."event_providers"("event_id");

-- CreateIndex
CREATE INDEX "event_providers_provider_id_idx" ON "public"."event_providers"("provider_id");

-- CreateIndex
CREATE INDEX "event_providers_provider_service_id_idx" ON "public"."event_providers"("provider_service_id");

-- CreateIndex
CREATE INDEX "event_providers_is_deleted_idx" ON "public"."event_providers"("is_deleted");

-- CreateIndex
CREATE INDEX "event_providers_event_id_is_deleted_idx" ON "public"."event_providers"("event_id", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "event_providers_event_id_provider_service_id_key" ON "public"."event_providers"("event_id", "provider_service_id");

-- AddForeignKey
ALTER TABLE "public"."service_provider_services" ADD CONSTRAINT "service_provider_services_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_provider_services" ADD CONSTRAINT "service_provider_services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_providers" ADD CONSTRAINT "event_providers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_providers" ADD CONSTRAINT "event_providers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_providers" ADD CONSTRAINT "event_providers_provider_service_id_fkey" FOREIGN KEY ("provider_service_id") REFERENCES "public"."service_provider_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
