-- CreateTable
CREATE TABLE "public"."uploaded_files" (
    "id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "size" INTEGER,
    "content_type" TEXT,
    "folder" TEXT,
    "object_id" TEXT,
    "object_type" TEXT,
    "relation" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uploaded_files_key_key" ON "public"."uploaded_files"("key");

-- CreateIndex
CREATE INDEX "uploaded_files_uploaded_by_idx" ON "public"."uploaded_files"("uploaded_by");

-- CreateIndex
CREATE INDEX "uploaded_files_folder_idx" ON "public"."uploaded_files"("folder");

-- CreateIndex
CREATE INDEX "uploaded_files_object_id_idx" ON "public"."uploaded_files"("object_id");

-- CreateIndex
CREATE INDEX "uploaded_files_object_type_idx" ON "public"."uploaded_files"("object_type");

-- CreateIndex
CREATE INDEX "uploaded_files_relation_idx" ON "public"."uploaded_files"("relation");

-- CreateIndex
CREATE INDEX "uploaded_files_is_deleted_idx" ON "public"."uploaded_files"("is_deleted");

-- CreateIndex
CREATE INDEX "uploaded_files_created_at_idx" ON "public"."uploaded_files"("created_at");

-- CreateIndex
CREATE INDEX "uploaded_files_uploaded_by_is_deleted_idx" ON "public"."uploaded_files"("uploaded_by", "is_deleted");

-- CreateIndex
CREATE INDEX "uploaded_files_object_id_object_type_idx" ON "public"."uploaded_files"("object_id", "object_type");

-- CreateIndex
CREATE INDEX "uploaded_files_object_type_relation_idx" ON "public"."uploaded_files"("object_type", "relation");

-- CreateIndex
CREATE INDEX "uploaded_files_object_id_object_type_relation_idx" ON "public"."uploaded_files"("object_id", "object_type", "relation");

-- AddForeignKey
ALTER TABLE "public"."uploaded_files" ADD CONSTRAINT "uploaded_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
