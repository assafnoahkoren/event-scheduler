-- CreateEnum
CREATE TYPE "public"."level" AS ENUM ('READ', 'WRITE', 'DELETE', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."asset_type" AS ENUM ('USER', 'SYSTEM');

-- CreateTable
CREATE TABLE "public"."user_asset_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level" "public"."level" NOT NULL,
    "asset_type" "public"."asset_type" NOT NULL,
    "asset_id" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "user_asset_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_asset_permissions_user_id_idx" ON "public"."user_asset_permissions"("user_id");

-- CreateIndex
CREATE INDEX "user_asset_permissions_asset_type_asset_id_idx" ON "public"."user_asset_permissions"("asset_type", "asset_id");

-- CreateIndex
CREATE INDEX "user_asset_permissions_expires_at_idx" ON "public"."user_asset_permissions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_asset_permissions_user_id_asset_type_asset_id_level_key" ON "public"."user_asset_permissions"("user_id", "asset_type", "asset_id", "level");

-- AddForeignKey
ALTER TABLE "public"."user_asset_permissions" ADD CONSTRAINT "user_asset_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
