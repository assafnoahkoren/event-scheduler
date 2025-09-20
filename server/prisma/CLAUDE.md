# Prisma Database Guidelines

## Soft Delete Implementation

### Overview
All models in the database use soft deletion instead of hard deletion. This means records are never physically removed from the database, but are instead marked as deleted.

### IMPORTANT: Required Fields for ALL Models
**Every model in the database MUST include soft delete fields. No exceptions.**

### Soft Delete Fields
Every model MUST include these two fields for soft deletion:
```prisma
// Soft delete
deletedAt   DateTime? @map("deleted_at")
isDeleted   Boolean   @default(false) @map("is_deleted")
```

And the corresponding indexes:
```prisma
@@index([isDeleted])
@@index([siteId, isDeleted]) // If the model has a siteId field
```

### How It Works
1. **Delete Operations**: When `delete()` or `deleteMany()` is called on any model, the Prisma extension automatically converts it to an update operation that sets:
   - `isDeleted = true`
   - `deletedAt = current timestamp`

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
- Product
- EventProduct

### Important Notes
- **ALL models MUST have soft delete fields** - This is required for the soft-delete extension to work properly
- When creating a new model, always add the soft delete fields and indexes
- Never manually implement delete logic - the extension handles it automatically
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
- Migration: `20250919130028_remove_deletedby_column` - Removed deletedBy column from all models