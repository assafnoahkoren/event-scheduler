# Claude Code Instructions

## Type Safety Best Practices

### Use tRPC Inferred Types Instead of Hard-Coded Interfaces

When building UI components that interact with backend endpoints, **ALWAYS use tRPC's type inference** instead of creating duplicate interface definitions.

#### For API Responses (Output Types):
```typescript
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../path/to/appRouter'

type RouterOutput = inferRouterOutputs<AppRouter>
type User = RouterOutput['users']['get']  // ✅ Correct
```

#### For API Inputs (Form Data):
```typescript
import type { inferRouterInputs } from '@trpc/server'
import type { AppRouter } from '../path/to/appRouter'

type RouterInput = inferRouterInputs<AppRouter>
type UserFormData = RouterInput['users']['create']  // ✅ Correct
```

#### Example - Form Component:
```typescript
// ❌ WRONG - Don't create duplicate interfaces
interface ServiceFormData {
  categoryId: string
  price?: number
  currency?: string
}

// ✅ CORRECT - Use tRPC inferred types
type ServiceFormData = Omit<RouterInput['serviceProviders']['addService'], 'serviceProviderId'>
```

#### Benefits:
- **Single source of truth**: Backend Zod schemas define types once
- **Automatic synchronization**: Frontend types update when backend changes
- **Type safety**: TypeScript catches mismatches at compile time
- **Less code**: No need to maintain duplicate type definitions

## Post-Change Checklist

After making changes to TypeScript files, run the following commands:

### Server
```bash
cd server
npm run tsc
```

### Webapp
```bash
cd webapp
npm run tsc
```

## Important Commands

### Server
- **Type checking**: `npm run tsc` - Run this after any TypeScript changes
- **Build**: `npm run build` - Compile TypeScript to JavaScript
- **Development**: `npm run dev` - Start development server with hot reload

### Webapp
- **Type checking**: `npm run tsc` - Run this after any TypeScript changes
- **Linting**: `npm run lint` - Check code style and potential issues
- **Build**: `npm run build` - Type check and build for production
- **Development**: `npm run dev` - Start Vite development server