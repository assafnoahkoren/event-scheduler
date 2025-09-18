/*
  Warnings:

  - You are about to drop the column `is_recurring` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `recurrence_rule` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."events" DROP COLUMN "is_recurring",
DROP COLUMN "recurrence_rule",
ADD COLUMN     "client_id" TEXT,
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "end_date" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."clients" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_site_id_idx" ON "public"."clients"("site_id");

-- CreateIndex
CREATE INDEX "clients_created_by_idx" ON "public"."clients"("created_by");

-- CreateIndex
CREATE INDEX "events_client_id_idx" ON "public"."events"("client_id");

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
