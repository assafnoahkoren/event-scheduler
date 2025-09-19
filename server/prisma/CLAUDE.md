# Prisma Database Guidelines

## Soft Delete Implementation

### Overview
All models in the database use soft deletion instead of hard deletion. This means records are never physically removed from the database, but are instead marked as deleted.

### Soft Delete Fields
Every model includes these three fields for soft deletion:
```prisma
// Soft delete
deletedAt   DateTime? @map("deleted_at")
deletedBy   String?   @map("deleted_by")
isDeleted   Boolean   @default(false) @map("is_deleted")
```

### How It Works
1. **Delete Operations**: When `delete()` or `deleteMany()` is called on any model, the Prisma extension automatically converts it to an update operation that sets:
   - `isDeleted = true`
   - `deletedAt = current timestamp`
   - `deletedBy = userId` (if provided)

2. **Query Filtering**: All find operations (`findMany`, `findFirst`, `findUnique`, etc.) automatically filter out soft-deleted records by adding `isDeleted: false` to the where clause.

3. **Updates**: Update operations also exclude soft-deleted records automatically.

### Implementation Details
- Uses Prisma Client Extensions (`$extends`) instead of deprecated middleware
- Located in: `src/lib/soft-delete-extension.ts`
- Applied globally in: `src/db.ts`
- Applies to ALL models automatically via `$allModels` query extension

### Finding Soft-Deleted Records
To explicitly query soft-deleted records:
```typescript
// Find only deleted records
await prisma.user.findMany({
  where: { isDeleted: true }
})

// Find all records including deleted
await prisma.user.findMany({
  where: {} // Don't specify isDeleted
})
```

### Models with Soft Delete
All models in the schema have soft delete fields:
- User
- Site
- SiteUser
- SiteInvitation
- Event
- Client
- Session
- RefreshToken
- PasswordReset
- UserAssetPermission

### Important Notes
- Never manually implement delete logic - the extension handles it automatically
- The `deletedBy` field is optional to support system-initiated deletions
- Soft-deleted records are excluded from all queries by default
- To permanently delete (hard delete), you would need to use raw SQL queries

### Performance Optimization
All models have indexes on the `isDeleted` field for optimal query performance:
- Single column index: `@@index([isDeleted])`
- Composite indexes for common queries like: `@@index([siteId, isDeleted])`

These indexes ensure that filtering soft-deleted records (which happens on every query) is fast and efficient.

### Migration History
- Migration: `20250919122848_add_soft_delete_to_all_models` - Added soft delete fields to all models
- Migration: `20250919125602_add_isdeleted_indexes` - Added indexes for isDeleted field on all models