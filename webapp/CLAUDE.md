# Frontend-Specific Claude Instructions

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
- Avoid using `any` type
- Prefer type inference over explicit types when possible

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