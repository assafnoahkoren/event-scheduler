-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('EVENT', 'PRE_EVENT_MEETING');

-- AlterTable
ALTER TABLE "public"."events" ADD COLUMN     "type" "public"."EventType" NOT NULL DEFAULT 'EVENT';
