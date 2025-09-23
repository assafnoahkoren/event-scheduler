/*
  Warnings:

  - You are about to drop the column `slug` on the `organizations` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."organizations_slug_idx";

-- DropIndex
DROP INDEX "public"."organizations_slug_key";

-- AlterTable
ALTER TABLE "public"."organizations" DROP COLUMN "slug";
