-- CreateEnum
CREATE TYPE "public"."WaitingListRuleType" AS ENUM ('SPECIFIC_DATES', 'DAY_OF_WEEK', 'DATE_RANGE');

-- CreateEnum
CREATE TYPE "public"."WaitingListStatus" AS ENUM ('PENDING', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."waiting_list_entries" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "rule_type" "public"."WaitingListRuleType" NOT NULL,
    "specific_dates" JSONB,
    "day_of_week" INTEGER,
    "date_range" JSONB,
    "expiration_date" TIMESTAMP(3) NOT NULL,
    "status" "public"."WaitingListStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "event_id" TEXT,
    "fulfilled_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waiting_list_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waiting_list_entries_site_id_idx" ON "public"."waiting_list_entries"("site_id");

-- CreateIndex
CREATE INDEX "waiting_list_entries_client_id_idx" ON "public"."waiting_list_entries"("client_id");

-- CreateIndex
CREATE INDEX "waiting_list_entries_status_idx" ON "public"."waiting_list_entries"("status");

-- CreateIndex
CREATE INDEX "waiting_list_entries_expiration_date_idx" ON "public"."waiting_list_entries"("expiration_date");

-- CreateIndex
CREATE INDEX "waiting_list_entries_created_by_idx" ON "public"."waiting_list_entries"("created_by");

-- CreateIndex
CREATE INDEX "waiting_list_entries_is_deleted_idx" ON "public"."waiting_list_entries"("is_deleted");

-- CreateIndex
CREATE INDEX "waiting_list_entries_site_id_is_deleted_idx" ON "public"."waiting_list_entries"("site_id", "is_deleted");

-- CreateIndex
CREATE INDEX "waiting_list_entries_site_id_status_is_deleted_idx" ON "public"."waiting_list_entries"("site_id", "status", "is_deleted");

-- AddForeignKey
ALTER TABLE "public"."waiting_list_entries" ADD CONSTRAINT "waiting_list_entries_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waiting_list_entries" ADD CONSTRAINT "waiting_list_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waiting_list_entries" ADD CONSTRAINT "waiting_list_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waiting_list_entries" ADD CONSTRAINT "waiting_list_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
