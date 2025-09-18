-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."SiteRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "public"."events" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_rule" TEXT,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_invitations" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."SiteRole" NOT NULL DEFAULT 'VIEWER',
    "invited_by" TEXT NOT NULL,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "message" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_by" TEXT,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_users" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "role" "public"."SiteRole" NOT NULL DEFAULT 'VIEWER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_site_id_idx" ON "public"."events"("site_id");

-- CreateIndex
CREATE INDEX "events_start_date_idx" ON "public"."events"("start_date");

-- CreateIndex
CREATE INDEX "events_created_by_idx" ON "public"."events"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "site_invitations_token_key" ON "public"."site_invitations"("token");

-- CreateIndex
CREATE INDEX "site_invitations_token_idx" ON "public"."site_invitations"("token");

-- CreateIndex
CREATE INDEX "site_invitations_email_idx" ON "public"."site_invitations"("email");

-- CreateIndex
CREATE INDEX "site_invitations_site_id_idx" ON "public"."site_invitations"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_invitations_site_id_email_key" ON "public"."site_invitations"("site_id", "email");

-- CreateIndex
CREATE INDEX "site_users_user_id_idx" ON "public"."site_users"("user_id");

-- CreateIndex
CREATE INDEX "site_users_site_id_idx" ON "public"."site_users"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_users_user_id_site_id_key" ON "public"."site_users"("user_id", "site_id");

-- CreateIndex
CREATE UNIQUE INDEX "sites_slug_key" ON "public"."sites"("slug");

-- CreateIndex
CREATE INDEX "sites_slug_idx" ON "public"."sites"("slug");

-- CreateIndex
CREATE INDEX "sites_owner_id_idx" ON "public"."sites"("owner_id");

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."site_invitations" ADD CONSTRAINT "site_invitations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."site_invitations" ADD CONSTRAINT "site_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."site_invitations" ADD CONSTRAINT "site_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."site_users" ADD CONSTRAINT "site_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."site_users" ADD CONSTRAINT "site_users_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sites" ADD CONSTRAINT "sites_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
