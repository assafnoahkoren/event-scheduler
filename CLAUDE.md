# Claude Code Instructions

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