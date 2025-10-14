/*
  Warnings:

  - You are about to drop the column `message` on the `user_activities` table. All the data in the column will be lost.
  - You are about to drop the column `message_data` on the `user_activities` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."ActivityDomain" AS ENUM ('EVENTS', 'PRODUCTS', 'CLIENTS', 'SERVICE_PROVIDERS', 'ORGANIZATIONS', 'SITES', 'FILES', 'AUTH');

-- AlterTable
ALTER TABLE "public"."user_activities" DROP COLUMN "message",
DROP COLUMN "message_data",
ADD COLUMN     "activity_domain" "public"."ActivityDomain",
ADD COLUMN     "data" JSONB;
