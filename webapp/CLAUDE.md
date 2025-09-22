# Frontend-Specific Claude Instructions

## RTL Support Guidelines
- **IMPORTANT**: Always use logical properties for spacing and positioning
- Use `ms-x` (margin-start) instead of `ml-x` (margin-left)
- Use `me-x` (margin-end) instead of `mr-x` (margin-right)
- Use `ps-x` (padding-start) instead of `pl-x` (padding-left)
- Use `pe-x` (padding-end) instead of `pr-x` (padding-right)
- Use `start-x` instead of `left-x`
- Use `end-x` instead of `right-x`
- This ensures proper support for RTL languages (Arabic, Hebrew)

## Internationalization (i18n) and Translations

### Translation System Architecture
The app uses i18next with TypeScript for type-safe translations:

#### File Structure:
```
src/
  locales/
    en/translation.ts    - English translations (TypeScript, source of truth for types)
    ar/translation.json  - Arabic translations (JSON)
    he/translation.json  - Hebrew translations (JSON)
  i18n/
    index.ts            - i18next configuration
    i18n-types.ts      - Type definitions (inferred from English)
    i18next.d.ts        - TypeScript declarations for i18next
```

#### Adding New Translations:
1. **Add to English file first** (`src/locales/en/translation.ts`):
   ```typescript
   export const enTranslation = {
     section: {
       newKey: "New translation text"
     }
   } as const
   ```

2. **Types are automatically inferred** - No need to update type definitions

3. **Add to other language files** (`ar/translation.json`, `he/translation.json`):
   ```json
   {
     "section": {
       "newKey": "ترجمة جديدة"
     }
   }
   ```

#### Using Translations in Components:
```typescript
import { useTranslation } from 'react-i18next'

function Component() {
  const { t } = useTranslation()

  // Type-safe with autocomplete
  return <h1>{t('sites.welcomeTitle')}</h1>
}
```

#### Key Features:
- **Type Safety**: The `t()` function provides autocomplete and type checking
- **RTL Support**: Arabic and Hebrew automatically set `dir="rtl"` on the HTML element
- **Language Detection**: Automatically detects user's preferred language
- **Persistence**: Language preference saved to localStorage

#### Important Notes:
- Always define new translations in the English file first (it's the source of types)
- The English file is TypeScript (`.ts`), others are JSON for simplicity
- Types are inferred from `enTranslation` object, ensuring they always match
- If you get type errors after adding translations, run `npm run tsc` to verify

## React Architecture

### Component Guidelines
- Use functional components with TypeScript
- Prefer composition over inheritance
- Keep components focused and single-purpose
- Use custom hooks for reusable logic

### State Management
- Use React Query (TanStack Query) for server state
- Use Context API for global UI state (theme, auth)
- Keep local state in components when possible
- Avoid prop drilling - use context or composition

### Styling
- Use Tailwind CSS utility classes
- Follow the existing design system
- Use CSS-in-JS only when dynamic styles needed
- Maintain consistent spacing and colors

### Routing
- Use React Router for navigation
- Implement route guards for protected pages
- Use lazy loading for route components when appropriate
- Keep route definitions centralized

## Type Safety
- Always define types for props
- Use tRPC's type inference for API calls
- **NEVER use `any` type** - always use proper types
- Prefer type inference over explicit types when possible
- **IMPORTANT: Always use actual types from tRPC router outputs instead of hardcoded interfaces**
  - Use `inferRouterOutputs<AppRouter>` to get types from API responses
  - Example: `type Event = RouterOutput['events']['list'][0]` instead of manually defining an Event interface
  - This ensures type safety and automatic updates when backend types change
- **Component Props Type Safety**:
  - Always use tRPC inferred types for data models in component props
  - Never create duplicate interface definitions for models that exist in the backend
  - Example for components:
    ```typescript
    import type { inferRouterOutputs } from '@trpc/server'
    import type { AppRouter } from '../../../server/src/routers/appRouter'

    type RouterOutput = inferRouterOutputs<AppRouter>
    type Client = RouterOutput['clients']['get']

    interface ComponentProps {
      client: Client  // Use tRPC type, not a custom interface
      onEdit: (client: Client) => void  // Use same type in callbacks
    }
    ```

## Component Structure
```
src/
  components/
    ui/          - Reusable UI components
    layouts/     - Page layouts
  pages/         - Route pages
  contexts/      - React contexts
  hooks/         - Custom hooks
  utils/         - Utility functions
```

## Common Frontend Commands
```bash
# Type checking
npm run tsc

# Development
npm run dev

# Build
npm run build

# Linting
npm run lint
```