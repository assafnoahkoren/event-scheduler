-- CreateIndex
CREATE INDEX "clients_is_deleted_idx" ON "public"."clients"("is_deleted");

-- CreateIndex
CREATE INDEX "clients_site_id_is_deleted_idx" ON "public"."clients"("site_id", "is_deleted");

-- CreateIndex
CREATE INDEX "events_is_deleted_idx" ON "public"."events"("is_deleted");

-- CreateIndex
CREATE INDEX "events_site_id_is_deleted_idx" ON "public"."events"("site_id", "is_deleted");

-- CreateIndex
CREATE INDEX "password_resets_is_deleted_idx" ON "public"."password_resets"("is_deleted");

-- CreateIndex
CREATE INDEX "refresh_tokens_is_deleted_idx" ON "public"."refresh_tokens"("is_deleted");

-- CreateIndex
CREATE INDEX "sessions_is_deleted_idx" ON "public"."sessions"("is_deleted");

-- CreateIndex
CREATE INDEX "site_invitations_is_deleted_idx" ON "public"."site_invitations"("is_deleted");

-- CreateIndex
CREATE INDEX "site_invitations_site_id_is_deleted_idx" ON "public"."site_invitations"("site_id", "is_deleted");

-- CreateIndex
CREATE INDEX "site_users_is_deleted_idx" ON "public"."site_users"("is_deleted");

-- CreateIndex
CREATE INDEX "site_users_site_id_is_deleted_idx" ON "public"."site_users"("site_id", "is_deleted");

-- CreateIndex
CREATE INDEX "sites_is_deleted_idx" ON "public"."sites"("is_deleted");

-- CreateIndex
CREATE INDEX "user_asset_permissions_is_deleted_idx" ON "public"."user_asset_permissions"("is_deleted");

-- CreateIndex
CREATE INDEX "users_is_deleted_idx" ON "public"."users"("is_deleted");
