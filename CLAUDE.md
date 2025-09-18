# Claude Code Instructions

## Post-Change Checklist

After making changes to TypeScript files, run the following commands:

### Server
```bash
cd server
npx tsc --noEmit
```

### Webapp
```bash
cd webapp
npx tsc -b
```

## Important Commands

### Server
- **Type checking**: `npx tsc --noEmit` - Run this after any TypeScript changes
- **Build**: `npm run build` - Compile TypeScript to JavaScript

### Webapp
- **Type checking**: `npx tsc -b` - Run this after any TypeScript changes
- **Linting**: `npm run lint` - Check code style and potential issues
- **Build**: `npm run build` - Type check and build for production