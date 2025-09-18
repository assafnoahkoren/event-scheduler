/*
  Warnings:

  - You are about to drop the column `description` on the `sites` table. All the data in the column will be lost.
  - You are about to drop the column `logo` on the `sites` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `sites` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `sites` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."sites_slug_idx";

-- DropIndex
DROP INDEX "public"."sites_slug_key";

-- AlterTable
ALTER TABLE "public"."sites" DROP COLUMN "description",
DROP COLUMN "logo",
DROP COLUMN "slug",
DROP COLUMN "timezone";
