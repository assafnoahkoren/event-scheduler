-- CreateTable
CREATE TABLE "public"."component_types" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "default_width_in_meters" DOUBLE PRECISION NOT NULL,
    "default_height_in_meters" DOUBLE PRECISION NOT NULL,
    "occupancy" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "component_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_floor_plan_layouts" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "floor_plan_id" TEXT NOT NULL,
    "name" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_floor_plan_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_layout_components" (
    "id" TEXT NOT NULL,
    "layout_id" TEXT NOT NULL,
    "component_type_id" TEXT NOT NULL,
    "x_in_meters" DOUBLE PRECISION NOT NULL,
    "y_in_meters" DOUBLE PRECISION NOT NULL,
    "width_in_meters" DOUBLE PRECISION NOT NULL,
    "height_in_meters" DOUBLE PRECISION NOT NULL,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "label" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_layout_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_floor_plans" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image_file_id" TEXT,
    "pixels_per_meter" DOUBLE PRECISION,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_floor_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."floor_plan_templates" (
    "id" TEXT NOT NULL,
    "floor_plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."floor_plan_template_components" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "component_type_id" TEXT NOT NULL,
    "x_in_meters" DOUBLE PRECISION NOT NULL,
    "y_in_meters" DOUBLE PRECISION NOT NULL,
    "width_in_meters" DOUBLE PRECISION NOT NULL,
    "height_in_meters" DOUBLE PRECISION NOT NULL,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "label" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_plan_template_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "component_types_organization_id_idx" ON "public"."component_types"("organization_id");

-- CreateIndex
CREATE INDEX "component_types_category_idx" ON "public"."component_types"("category");

-- CreateIndex
CREATE INDEX "component_types_is_deleted_idx" ON "public"."component_types"("is_deleted");

-- CreateIndex
CREATE INDEX "component_types_organization_id_is_deleted_idx" ON "public"."component_types"("organization_id", "is_deleted");

-- CreateIndex
CREATE INDEX "event_floor_plan_layouts_event_id_idx" ON "public"."event_floor_plan_layouts"("event_id");

-- CreateIndex
CREATE INDEX "event_floor_plan_layouts_floor_plan_id_idx" ON "public"."event_floor_plan_layouts"("floor_plan_id");

-- CreateIndex
CREATE INDEX "event_floor_plan_layouts_is_deleted_idx" ON "public"."event_floor_plan_layouts"("is_deleted");

-- CreateIndex
CREATE INDEX "event_floor_plan_layouts_event_id_is_deleted_idx" ON "public"."event_floor_plan_layouts"("event_id", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "event_floor_plan_layouts_event_id_floor_plan_id_key" ON "public"."event_floor_plan_layouts"("event_id", "floor_plan_id");

-- CreateIndex
CREATE INDEX "event_layout_components_layout_id_idx" ON "public"."event_layout_components"("layout_id");

-- CreateIndex
CREATE INDEX "event_layout_components_component_type_id_idx" ON "public"."event_layout_components"("component_type_id");

-- CreateIndex
CREATE INDEX "event_layout_components_is_deleted_idx" ON "public"."event_layout_components"("is_deleted");

-- CreateIndex
CREATE INDEX "event_layout_components_layout_id_is_deleted_idx" ON "public"."event_layout_components"("layout_id", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "site_floor_plans_image_file_id_key" ON "public"."site_floor_plans"("image_file_id");

-- CreateIndex
CREATE INDEX "site_floor_plans_site_id_idx" ON "public"."site_floor_plans"("site_id");

-- CreateIndex
CREATE INDEX "site_floor_plans_sort_order_idx" ON "public"."site_floor_plans"("sort_order");

-- CreateIndex
CREATE INDEX "site_floor_plans_is_deleted_idx" ON "public"."site_floor_plans"("is_deleted");

-- CreateIndex
CREATE INDEX "site_floor_plans_site_id_is_deleted_idx" ON "public"."site_floor_plans"("site_id", "is_deleted");

-- CreateIndex
CREATE INDEX "floor_plan_templates_floor_plan_id_idx" ON "public"."floor_plan_templates"("floor_plan_id");

-- CreateIndex
CREATE INDEX "floor_plan_templates_sort_order_idx" ON "public"."floor_plan_templates"("sort_order");

-- CreateIndex
CREATE INDEX "floor_plan_templates_is_deleted_idx" ON "public"."floor_plan_templates"("is_deleted");

-- CreateIndex
CREATE INDEX "floor_plan_templates_floor_plan_id_is_deleted_idx" ON "public"."floor_plan_templates"("floor_plan_id", "is_deleted");

-- CreateIndex
CREATE INDEX "floor_plan_template_components_template_id_idx" ON "public"."floor_plan_template_components"("template_id");

-- CreateIndex
CREATE INDEX "floor_plan_template_components_component_type_id_idx" ON "public"."floor_plan_template_components"("component_type_id");

-- CreateIndex
CREATE INDEX "floor_plan_template_components_is_deleted_idx" ON "public"."floor_plan_template_components"("is_deleted");

-- CreateIndex
CREATE INDEX "floor_plan_template_components_template_id_is_deleted_idx" ON "public"."floor_plan_template_components"("template_id", "is_deleted");

-- AddForeignKey
ALTER TABLE "public"."component_types" ADD CONSTRAINT "component_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_floor_plan_layouts" ADD CONSTRAINT "event_floor_plan_layouts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_floor_plan_layouts" ADD CONSTRAINT "event_floor_plan_layouts_floor_plan_id_fkey" FOREIGN KEY ("floor_plan_id") REFERENCES "public"."site_floor_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_layout_components" ADD CONSTRAINT "event_layout_components_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "public"."event_floor_plan_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_layout_components" ADD CONSTRAINT "event_layout_components_component_type_id_fkey" FOREIGN KEY ("component_type_id") REFERENCES "public"."component_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."site_floor_plans" ADD CONSTRAINT "site_floor_plans_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."site_floor_plans" ADD CONSTRAINT "site_floor_plans_image_file_id_fkey" FOREIGN KEY ("image_file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."floor_plan_templates" ADD CONSTRAINT "floor_plan_templates_floor_plan_id_fkey" FOREIGN KEY ("floor_plan_id") REFERENCES "public"."site_floor_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."floor_plan_template_components" ADD CONSTRAINT "floor_plan_template_components_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."floor_plan_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."floor_plan_template_components" ADD CONSTRAINT "floor_plan_template_components_component_type_id_fkey" FOREIGN KEY ("component_type_id") REFERENCES "public"."component_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
