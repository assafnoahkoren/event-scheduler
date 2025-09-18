-- AlterTable
ALTER TABLE "public"."refresh_tokens" ADD COLUMN     "is_revoked" BOOLEAN NOT NULL DEFAULT false;
