/*
  Warnings:

  - You are about to drop the column `deleted_by` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `password_resets` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `site_invitations` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `site_users` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `sites` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `user_asset_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."clients" DROP COLUMN "deleted_by";

-- AlterTable
ALTER TABLE "public"."events" DROP COLUMN "deleted_by";

-- AlterTable
ALTER TABLE "public"."password_resets" DROP COLUMN "deleted_by";

-- AlterTable
ALTER TABLE "public"."refresh_tokens" DROP COLUMN "deleted_by";

-- AlterTable
ALTER TABLE "public"."sessions" DROP COLUMN "deleted_by";

-- AlterTable
ALTER TABLE "public"."site_invitations" DROP COLUMN "deleted_by";

-- AlterTable
ALTER TABLE "public"."site_users" DROP COLUMN "deleted_by";

-- AlterTable
ALTER TABLE "public"."sites" DROP COLUMN "deleted_by";

-- AlterTable
ALTER TABLE "public"."user_asset_permissions" DROP COLUMN "deleted_by";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "deleted_by";
