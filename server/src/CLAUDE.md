# Source Code Architecture Guidelines

## Zod Schema Pattern
**IMPORTANT**: Define Zod schemas in the service layer and use type inference throughout the application.

### Best Practices:
1. **Define schemas in services** - All validation schemas should be defined in the service files
2. **Export both schema and type** - Export the Zod schema and use `z.infer<typeof schema>` for the TypeScript type
3. **Single source of truth** - Never duplicate schemas; import and reuse them
4. **Type inference over interfaces** - Don't create manual interfaces when you can infer from Zod
5. **Frontend type consumption** - Frontend should use tRPC's `inferRouterInputs` and `inferRouterOutputs` to consume these types automatically

### Example Pattern:
```typescript
// In service file (e.g., site.service.ts)
import { z } from 'zod'

// Define schema
export const createSiteSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
})

// Infer type from schema
export type CreateSiteInput = z.infer<typeof createSiteSchema>

// Use in service methods
async createSite(input: CreateSiteInput) { ... }
```

```typescript
// In router file (e.g., site.router.ts)
import { createSiteSchema } from '../services/site.service'

// Use schema directly in router
.input(createSiteSchema)
.mutation(async ({ input }) => { ... })

// Or extend for router-specific needs
const updateSiteWithIdSchema = updateSiteSchema.extend({
  siteId: z.uuid(),
})
```

```typescript
// Frontend consumption (in React components)
import type { inferRouterInputs } from '@trpc/server'
import type { AppRouter } from '../path/to/appRouter'

type RouterInput = inferRouterInputs<AppRouter>
type CreateSiteFormData = RouterInput['sites']['create']  // Automatically typed from Zod schema
```

### Deprecated Zod Methods:
Use the new Zod v4 syntax:
- ❌ `z.string().email()` → ✅ `z.email()`
- ❌ `z.string().url()` → ✅ `z.url()`
- ❌ `z.string().uuid()` → ✅ `z.uuid()`
- ❌ `z.nativeEnum(MyEnum)` → ✅ `z.enum(['VALUE1', 'VALUE2'] as const)`

## Service Layer Guidelines

### Responsibilities:
- **Business logic** - All business rules and validations
- **Database operations** - Direct Prisma client usage
- **Schema definitions** - Zod schemas for validation
- **Type exports** - TypeScript types for consumers

### Structure:
```typescript
// 1. Import dependencies
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

// 2. Define schemas
export const schemaName = z.object({ ... })

// 3. Infer types
export type TypeName = z.infer<typeof schemaName>

// 4. Create service class
class ServiceName {
  // Methods with clear single responsibilities
}

// 5. Export singleton instance
export const serviceName = new ServiceName()
```

## Router Layer Guidelines

### Responsibilities:
- **Input validation** - Using schemas from services
- **Error handling** - Catch and format errors as TRPCError
- **Context access** - User authentication and authorization
- **Service orchestration** - Call appropriate service methods

### Error Handling Pattern:
```typescript
.mutation(async ({ input, ctx }) => {
  try {
    return await service.method(ctx.user.id, input)
  } catch (error: any) {
    throw new TRPCError({
      code: 'BAD_REQUEST', // or appropriate code
      message: error.message || 'Operation failed',
    })
  }
})
```