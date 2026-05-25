-- AlterTable
ALTER TABLE "public"."events" ADD COLUMN     "acum_paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deposit_amount" DOUBLE PRECISION;
