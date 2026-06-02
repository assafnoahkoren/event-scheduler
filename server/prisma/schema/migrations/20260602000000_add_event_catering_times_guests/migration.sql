-- AlterTable
ALTER TABLE "public"."events" ADD COLUMN     "catering" TEXT,
ADD COLUMN     "end_time" TEXT,
ADD COLUMN     "guest_count_adults" INTEGER,
ADD COLUMN     "guest_count_children" INTEGER,
ADD COLUMN     "start_time" TEXT;
