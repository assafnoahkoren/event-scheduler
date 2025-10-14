/*
  Warnings:

  - The values [EVENT_CREATED_WITH_CLIENT,EVENT_UPDATED,EVENT_UPDATED_WITH_CLIENT,EVENT_DELETED_WITH_CLIENT,CLIENT_CREATED,CLIENT_UPDATED,CLIENT_DELETED,SERVICE_PROVIDER_CREATED,SERVICE_PROVIDER_UPDATED,SERVICE_PROVIDER_DELETED] on the enum `ActivityMessage` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ActivityMessage_new" AS ENUM ('EVENT_CREATED', 'EVENT_DELETED', 'EVENT_RESCHEDULED', 'EVENT_STATUS_CHANGED');
ALTER TABLE "public"."user_activities" ALTER COLUMN "message_type" TYPE "public"."ActivityMessage_new" USING ("message_type"::text::"public"."ActivityMessage_new");
ALTER TYPE "public"."ActivityMessage" RENAME TO "ActivityMessage_old";
ALTER TYPE "public"."ActivityMessage_new" RENAME TO "ActivityMessage";
DROP TYPE "public"."ActivityMessage_old";
COMMIT;
