-- CreateTable
CREATE TABLE "public"."constructor_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "constructor_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."constructors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "constructors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."constructor_services" (
    "id" TEXT NOT NULL,
    "constructor_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "currency" TEXT,
    "fileLinks" TEXT[],
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "constructor_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_constructors" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "constructor_id" TEXT NOT NULL,
    "constructor_service_id" TEXT NOT NULL,
    "agreed_price" DOUBLE PRECISION,
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

    CONSTRAINT "event_constructors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "constructor_categories_name_key" ON "public"."constructor_categories"("name");

-- CreateIndex
CREATE INDEX "constructor_categories_is_deleted_idx" ON "public"."constructor_categories"("is_deleted");

-- CreateIndex
CREATE INDEX "constructors_is_deleted_idx" ON "public"."constructors"("is_deleted");

-- CreateIndex
CREATE INDEX "constructors_name_idx" ON "public"."constructors"("name");

-- CreateIndex
CREATE INDEX "constructor_services_constructor_id_idx" ON "public"."constructor_services"("constructor_id");

-- CreateIndex
CREATE INDEX "constructor_services_category_id_idx" ON "public"."constructor_services"("category_id");

-- CreateIndex
CREATE INDEX "constructor_services_is_deleted_idx" ON "public"."constructor_services"("is_deleted");

-- CreateIndex
CREATE INDEX "constructor_services_constructor_id_is_deleted_idx" ON "public"."constructor_services"("constructor_id", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "constructor_services_constructor_id_category_id_key" ON "public"."constructor_services"("constructor_id", "category_id");

-- CreateIndex
CREATE INDEX "event_constructors_event_id_idx" ON "public"."event_constructors"("event_id");

-- CreateIndex
CREATE INDEX "event_constructors_constructor_id_idx" ON "public"."event_constructors"("constructor_id");

-- CreateIndex
CREATE INDEX "event_constructors_constructor_service_id_idx" ON "public"."event_constructors"("constructor_service_id");

-- CreateIndex
CREATE INDEX "event_constructors_is_deleted_idx" ON "public"."event_constructors"("is_deleted");

-- CreateIndex
CREATE INDEX "event_constructors_event_id_is_deleted_idx" ON "public"."event_constructors"("event_id", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "event_constructors_event_id_constructor_service_id_key" ON "public"."event_constructors"("event_id", "constructor_service_id");

-- AddForeignKey
ALTER TABLE "public"."constructor_services" ADD CONSTRAINT "constructor_services_constructor_id_fkey" FOREIGN KEY ("constructor_id") REFERENCES "public"."constructors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."constructor_services" ADD CONSTRAINT "constructor_services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."constructor_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_constructors" ADD CONSTRAINT "event_constructors_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_constructors" ADD CONSTRAINT "event_constructors_constructor_id_fkey" FOREIGN KEY ("constructor_id") REFERENCES "public"."constructors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_constructors" ADD CONSTRAINT "event_constructors_constructor_service_id_fkey" FOREIGN KEY ("constructor_service_id") REFERENCES "public"."constructor_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
