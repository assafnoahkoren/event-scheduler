-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('CREATE', 'EDIT', 'DELETE', 'ACCESS', 'INVITE', 'ACCEPT', 'REJECT', 'UPLOAD', 'DOWNLOAD', 'SHARE');

-- CreateTable
CREATE TABLE "public"."user_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_id" TEXT,
    "activity_type" "public"."ActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "object_type" TEXT NOT NULL,
    "object_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_activity_views" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_activity_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_activities_user_id_idx" ON "public"."user_activities"("user_id");

-- CreateIndex
CREATE INDEX "user_activities_organization_id_idx" ON "public"."user_activities"("organization_id");

-- CreateIndex
CREATE INDEX "user_activities_event_id_idx" ON "public"."user_activities"("event_id");

-- CreateIndex
CREATE INDEX "user_activities_object_type_object_id_idx" ON "public"."user_activities"("object_type", "object_id");

-- CreateIndex
CREATE INDEX "user_activities_activity_type_idx" ON "public"."user_activities"("activity_type");

-- CreateIndex
CREATE INDEX "user_activities_is_deleted_idx" ON "public"."user_activities"("is_deleted");

-- CreateIndex
CREATE INDEX "user_activities_organization_id_is_deleted_idx" ON "public"."user_activities"("organization_id", "is_deleted");

-- CreateIndex
CREATE INDEX "user_activities_event_id_is_deleted_idx" ON "public"."user_activities"("event_id", "is_deleted");

-- CreateIndex
CREATE INDEX "user_activity_views_activity_id_idx" ON "public"."user_activity_views"("activity_id");

-- CreateIndex
CREATE INDEX "user_activity_views_user_id_idx" ON "public"."user_activity_views"("user_id");

-- CreateIndex
CREATE INDEX "user_activity_views_is_deleted_idx" ON "public"."user_activity_views"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "user_activity_views_activity_id_user_id_key" ON "public"."user_activity_views"("activity_id", "user_id");

-- AddForeignKey
ALTER TABLE "public"."user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_activities" ADD CONSTRAINT "user_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_activities" ADD CONSTRAINT "user_activities_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_activity_views" ADD CONSTRAINT "user_activity_views_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."user_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_activity_views" ADD CONSTRAINT "user_activity_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
