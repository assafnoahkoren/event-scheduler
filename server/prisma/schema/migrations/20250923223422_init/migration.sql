-- CreateEnum
CREATE TYPE "public"."level" AS ENUM ('READ', 'WRITE', 'DELETE', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."asset_type" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ProductType" AS ENUM ('SERVICE', 'PHYSICAL', 'EXTERNAL_SERVICE');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."SiteRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."WaitingListRuleType" AS ENUM ('SPECIFIC_DATES', 'DAY_OF_WEEK', 'DATE_RANGE');

-- CreateEnum
CREATE TYPE "public"."WaitingListStatus" AS ENUM ('PENDING', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."password_resets" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

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
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_asset_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "avatar_url" TEXT,
    "bio" TEXT,
    "language" TEXT DEFAULT 'en',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "login_count" INTEGER NOT NULL DEFAULT 0,
    "password_changed_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clients" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."events" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "location" TEXT,
    "client_id" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_by" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invited_by_id" TEXT,
    "invited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "default_currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "max_sites" INTEGER NOT NULL DEFAULT 3,
    "max_users" INTEGER NOT NULL DEFAULT 10,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."ProductType" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_products" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION,
    "currency" TEXT,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_providers" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "provider_service_id" TEXT NOT NULL,
    "agreed_price" DOUBLE PRECISION,
    "provider_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),
    "payment_notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_categories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_providers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_provider_services" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "provider_price" DOUBLE PRECISION,
    "currency" TEXT,
    "fileLinks" TEXT[],
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_provider_services_pkey" PRIMARY KEY ("id")
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
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

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
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "site_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organization_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."waiting_list_entries" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "rule_type" "public"."WaitingListRuleType" NOT NULL,
    "specific_dates" JSONB,
    "days_of_week" JSONB,
    "date_range" JSONB,
    "expiration_date" TIMESTAMP(3) NOT NULL,
    "status" "public"."WaitingListStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "event_id" TEXT,
    "fulfilled_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waiting_list_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "public"."password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_user_id_idx" ON "public"."password_resets"("user_id");

-- CreateIndex
CREATE INDEX "password_resets_token_idx" ON "public"."password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_expires_at_idx" ON "public"."password_resets"("expires_at");

-- CreateIndex
CREATE INDEX "password_resets_is_deleted_idx" ON "public"."password_resets"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "public"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "public"."refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "public"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "public"."refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_is_deleted_idx" ON "public"."refresh_tokens"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "public"."sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "public"."sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "public"."sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "public"."sessions"("expires_at");

-- CreateIndex
CREATE INDEX "sessions_is_deleted_idx" ON "public"."sessions"("is_deleted");

-- CreateIndex
CREATE INDEX "user_asset_permissions_user_id_idx" ON "public"."user_asset_permissions"("user_id");

-- CreateIndex
CREATE INDEX "user_asset_permissions_asset_type_asset_id_idx" ON "public"."user_asset_permissions"("asset_type", "asset_id");

-- CreateIndex
CREATE INDEX "user_asset_permissions_expires_at_idx" ON "public"."user_asset_permissions"("expires_at");

-- CreateIndex
CREATE INDEX "user_asset_permissions_is_deleted_idx" ON "public"."user_asset_permissions"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "user_asset_permissions_user_id_asset_type_asset_id_level_key" ON "public"."user_asset_permissions"("user_id", "asset_type", "asset_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_is_deleted_idx" ON "public"."users"("is_deleted");

-- CreateIndex
CREATE INDEX "clients_site_id_idx" ON "public"."clients"("site_id");

-- CreateIndex
CREATE INDEX "clients_organization_id_idx" ON "public"."clients"("organization_id");

-- CreateIndex
CREATE INDEX "clients_created_by_idx" ON "public"."clients"("created_by");

-- CreateIndex
CREATE INDEX "clients_is_deleted_idx" ON "public"."clients"("is_deleted");

-- CreateIndex
CREATE INDEX "clients_site_id_is_deleted_idx" ON "public"."clients"("site_id", "is_deleted");

-- CreateIndex
CREATE INDEX "clients_organization_id_is_deleted_idx" ON "public"."clients"("organization_id", "is_deleted");

-- CreateIndex
CREATE INDEX "events_site_id_idx" ON "public"."events"("site_id");

-- CreateIndex
CREATE INDEX "events_start_date_idx" ON "public"."events"("start_date");

-- CreateIndex
CREATE INDEX "events_created_by_idx" ON "public"."events"("created_by");

-- CreateIndex
CREATE INDEX "events_client_id_idx" ON "public"."events"("client_id");

-- CreateIndex
CREATE INDEX "events_is_deleted_idx" ON "public"."events"("is_deleted");

-- CreateIndex
CREATE INDEX "events_site_id_is_deleted_idx" ON "public"."events"("site_id", "is_deleted");

-- CreateIndex
CREATE INDEX "organization_members_organization_id_idx" ON "public"."organization_members"("organization_id");

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "public"."organization_members"("user_id");

-- CreateIndex
CREATE INDEX "organization_members_is_active_idx" ON "public"."organization_members"("is_active");

-- CreateIndex
CREATE INDEX "organization_members_is_deleted_idx" ON "public"."organization_members"("is_deleted");

-- CreateIndex
CREATE INDEX "organization_members_organization_id_is_deleted_idx" ON "public"."organization_members"("organization_id", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "public"."organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "public"."organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "public"."organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_owner_id_idx" ON "public"."organizations"("owner_id");

-- CreateIndex
CREATE INDEX "organizations_is_deleted_idx" ON "public"."organizations"("is_deleted");

-- CreateIndex
CREATE INDEX "products_site_id_idx" ON "public"."products"("site_id");

-- CreateIndex
CREATE INDEX "products_is_deleted_idx" ON "public"."products"("is_deleted");

-- CreateIndex
CREATE INDEX "products_site_id_is_deleted_idx" ON "public"."products"("site_id", "is_deleted");

-- CreateIndex
CREATE INDEX "event_products_event_id_idx" ON "public"."event_products"("event_id");

-- CreateIndex
CREATE INDEX "event_products_product_id_idx" ON "public"."event_products"("product_id");

-- CreateIndex
CREATE INDEX "event_products_is_deleted_idx" ON "public"."event_products"("is_deleted");

-- CreateIndex
CREATE INDEX "event_products_event_id_is_deleted_idx" ON "public"."event_products"("event_id", "is_deleted");

-- CreateIndex
CREATE INDEX "event_products_event_id_product_id_idx" ON "public"."event_products"("event_id", "product_id");

-- CreateIndex
CREATE INDEX "event_providers_event_id_idx" ON "public"."event_providers"("event_id");

-- CreateIndex
CREATE INDEX "event_providers_provider_id_idx" ON "public"."event_providers"("provider_id");

-- CreateIndex
CREATE INDEX "event_providers_provider_service_id_idx" ON "public"."event_providers"("provider_service_id");

-- CreateIndex
CREATE INDEX "event_providers_is_deleted_idx" ON "public"."event_providers"("is_deleted");

-- CreateIndex
CREATE INDEX "event_providers_event_id_is_deleted_idx" ON "public"."event_providers"("event_id", "is_deleted");

-- CreateIndex
CREATE INDEX "service_categories_is_deleted_idx" ON "public"."service_categories"("is_deleted");

-- CreateIndex
CREATE INDEX "service_categories_organization_id_idx" ON "public"."service_categories"("organization_id");

-- CreateIndex
CREATE INDEX "service_categories_organization_id_is_deleted_idx" ON "public"."service_categories"("organization_id", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_organization_id_name_key" ON "public"."service_categories"("organization_id", "name");

-- CreateIndex
CREATE INDEX "service_providers_is_deleted_idx" ON "public"."service_providers"("is_deleted");

-- CreateIndex
CREATE INDEX "service_providers_name_idx" ON "public"."service_providers"("name");

-- CreateIndex
CREATE INDEX "service_providers_organization_id_idx" ON "public"."service_providers"("organization_id");

-- CreateIndex
CREATE INDEX "service_providers_organization_id_is_deleted_idx" ON "public"."service_providers"("organization_id", "is_deleted");

-- CreateIndex
CREATE INDEX "service_provider_services_provider_id_idx" ON "public"."service_provider_services"("provider_id");

-- CreateIndex
CREATE INDEX "service_provider_services_category_id_idx" ON "public"."service_provider_services"("category_id");

-- CreateIndex
CREATE INDEX "service_provider_services_is_deleted_idx" ON "public"."service_provider_services"("is_deleted");

-- CreateIndex
CREATE INDEX "service_provider_services_provider_id_is_deleted_idx" ON "public"."service_provider_services"("provider_id", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_services_provider_id_category_id_key" ON "public"."service_provider_services"("provider_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_invitations_token_key" ON "public"."site_invitations"("token");

-- CreateIndex
CREATE INDEX "site_invitations_token_idx" ON "public"."site_invitations"("token");

-- CreateIndex
CREATE INDEX "site_invitations_email_idx" ON "public"."site_invitations"("email");

-- CreateIndex
CREATE INDEX "site_invitations_site_id_idx" ON "public"."site_invitations"("site_id");

-- CreateIndex
CREATE INDEX "site_invitations_is_deleted_idx" ON "public"."site_invitations"("is_deleted");

-- CreateIndex
CREATE INDEX "site_invitations_site_id_is_deleted_idx" ON "public"."site_invitations"("site_id", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "site_invitations_site_id_email_key" ON "public"."site_invitations"("site_id", "email");

-- CreateIndex
CREATE INDEX "site_users_user_id_idx" ON "public"."site_users"("user_id");

-- CreateIndex
CREATE INDEX "site_users_site_id_idx" ON "public"."site_users"("site_id");

-- CreateIndex
CREATE INDEX "site_users_is_deleted_idx" ON "public"."site_users"("is_deleted");

-- CreateIndex
CREATE INDEX "site_users_site_id_is_deleted_idx" ON "public"."site_users"("site_id", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "site_users_user_id_site_id_key" ON "public"."site_users"("user_id", "site_id");

-- CreateIndex
CREATE INDEX "sites_owner_id_idx" ON "public"."sites"("owner_id");

-- CreateIndex
CREATE INDEX "sites_organization_id_idx" ON "public"."sites"("organization_id");

-- CreateIndex
CREATE INDEX "sites_is_deleted_idx" ON "public"."sites"("is_deleted");

-- CreateIndex
CREATE INDEX "sites_organization_id_is_deleted_idx" ON "public"."sites"("organization_id", "is_deleted");

-- CreateIndex
CREATE INDEX "waiting_list_entries_site_id_idx" ON "public"."waiting_list_entries"("site_id");

-- CreateIndex
CREATE INDEX "waiting_list_entries_client_id_idx" ON "public"."waiting_list_entries"("client_id");

-- CreateIndex
CREATE INDEX "waiting_list_entries_status_idx" ON "public"."waiting_list_entries"("status");

-- CreateIndex
CREATE INDEX "waiting_list_entries_expiration_date_idx" ON "public"."waiting_list_entries"("expiration_date");

-- CreateIndex
CREATE INDEX "waiting_list_entries_created_by_idx" ON "public"."waiting_list_entries"("created_by");

-- CreateIndex
CREATE INDEX "waiting_list_entries_is_deleted_idx" ON "public"."waiting_list_entries"("is_deleted");

-- CreateIndex
CREATE INDEX "waiting_list_entries_site_id_is_deleted_idx" ON "public"."waiting_list_entries"("site_id", "is_deleted");

-- CreateIndex
CREATE INDEX "waiting_list_entries_site_id_status_is_deleted_idx" ON "public"."waiting_list_entries"("site_id", "status", "is_deleted");

-- AddForeignKey
ALTER TABLE "public"."password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_asset_permissions" ADD CONSTRAINT "user_asset_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_members" ADD CONSTRAINT "organization_members_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_products" ADD CONSTRAINT "event_products_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_products" ADD CONSTRAINT "event_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_providers" ADD CONSTRAINT "event_providers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_providers" ADD CONSTRAINT "event_providers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_providers" ADD CONSTRAINT "event_providers_provider_service_id_fkey" FOREIGN KEY ("provider_service_id") REFERENCES "public"."service_provider_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_categories" ADD CONSTRAINT "service_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_providers" ADD CONSTRAINT "service_providers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_provider_services" ADD CONSTRAINT "service_provider_services_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_provider_services" ADD CONSTRAINT "service_provider_services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "public"."sites" ADD CONSTRAINT "sites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sites" ADD CONSTRAINT "sites_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waiting_list_entries" ADD CONSTRAINT "waiting_list_entries_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waiting_list_entries" ADD CONSTRAINT "waiting_list_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waiting_list_entries" ADD CONSTRAINT "waiting_list_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waiting_list_entries" ADD CONSTRAINT "waiting_list_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
