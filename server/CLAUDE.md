# Server-Specific Claude Instructions

## Backend Architecture

### Service Layer Pattern
Services should handle all business logic and database operations:
- Define Zod schemas for validation
- Export both schemas and inferred types
- Keep services focused on single responsibilities
- Use dependency injection pattern where applicable

### Database Guidelines
- Always use transactions for multi-table operations
- Use soft deletes where appropriate (isActive flags)
- Include proper indexes in Prisma schema
- Run migrations with descriptive names

### API Design
- Use descriptive names for tRPC procedures
- Group related endpoints in routers
- Always validate input with Zod schemas
- Return consistent error messages

### Testing Requirements
After any service or router changes:
1. Run type checking: `npm run tsc`
2. Test affected endpoints manually
3. Verify database migrations if schema changed

## Common Server Commands
```bash
# Type checking
npm run tsc

# Database operations
npx prisma migrate dev --name descriptive_name
npx prisma generate
npx prisma studio

# Development
npm run dev
```

## Environment Variables
Required in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `NODE_ENV` - development/production