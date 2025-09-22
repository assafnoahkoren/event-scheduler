/*
  Warnings:

  - You are about to drop the column `day_of_week` on the `waiting_list_entries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."waiting_list_entries" DROP COLUMN "day_of_week",
ADD COLUMN     "days_of_week" JSONB;
