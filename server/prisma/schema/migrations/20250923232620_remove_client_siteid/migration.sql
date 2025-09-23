/*
  Warnings:

  - You are about to drop the column `site_id` on the `clients` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."clients" DROP CONSTRAINT "clients_site_id_fkey";

-- DropIndex
DROP INDEX "public"."clients_site_id_idx";

-- DropIndex
DROP INDEX "public"."clients_site_id_is_deleted_idx";

-- AlterTable
ALTER TABLE "public"."clients" DROP COLUMN "site_id";
