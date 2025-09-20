/*
  Warnings:

  - The values [IN_PROGRESS,COMPLETED] on the enum `EventStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."EventStatus_new" AS ENUM ('DRAFT', 'SCHEDULED', 'CANCELLED');
ALTER TABLE "public"."events" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."events" ALTER COLUMN "status" TYPE "public"."EventStatus_new" USING ("status"::text::"public"."EventStatus_new");
ALTER TYPE "public"."EventStatus" RENAME TO "EventStatus_old";
ALTER TYPE "public"."EventStatus_new" RENAME TO "EventStatus";
DROP TYPE "public"."EventStatus_old";
ALTER TABLE "public"."events" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';
COMMIT;

-- DropIndex
DROP INDEX "public"."users_username_idx";

-- DropIndex
DROP INDEX "public"."users_username_key";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "username";
