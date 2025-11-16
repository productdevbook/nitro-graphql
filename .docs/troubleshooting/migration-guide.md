---
category: Troubleshooting
---

# Migration Guide

<FunctionInfo fn="migrationGuide"/>

Guide for upgrading Nitro GraphQL between major versions.

## Overview

This guide covers breaking changes and migration steps for upgrading between major versions of Nitro GraphQL.

**Current Version:** 1.5.0
**Next Major Version:** 2.0.0 (upcoming)

---

## Migrating to v2.0 (Upcoming)

Version 2.0 will bring Nitro v3 and H3 v2 compatibility with several breaking changes.

### Breaking Changes

#### 1. H3 v2 API Changes

**What's changing:**
- H3 v1 → H3 v2 APIs
- Event context structure
- Import paths

**Before (v1.x with H3 v1):**
```typescript
// server/graphql/context.ts
declare module 'nitro/h3' {
  interface H3EventContext {
    db: Database
  }
}
```

**After (v2.x with H3 v2):**
```typescript
// server/graphql/context.ts
import type { H3Event } from 'nitro/h3'

declare module 'nitro/h3' {
  interface H3EventContext {
    db: Database
  }
}
```

**Migration steps:**
1. Update H3 to v2:
```bash
pnpm add h3@^2.0.0
```

2. Update context type definitions to use H3 v2 types

3. Test all resolvers that access context

---

#### 2. Nitro v3 Compatibility

**What's changing:**
- Nitro v2 → Nitro v3 module system
- Build output structure
- Virtual import paths

**Migration steps:**
1. Update Nitro:
```bash
pnpm add nitropack@^3.0.0
```

2. Update configuration syntax if needed

3. Clear build cache:
```bash
rm -rf .nitro .output
```

4. Rebuild:
```bash
pnpm dev
```

---

#### 3. Default Export Removal

**What's changing:**
Default exports for resolvers are **deprecated** and will be removed in v2.0.

**Before (v1.x - deprecated):**
```typescript
// ⚠️ Deprecated
export default defineQuery({
  user: async (_, { id }) => {
    return await db.user.findUnique({ where: { id } })
  }
})
```

**After (v2.x - required):**
```typescript
// ✅ Required
export const userQueries = defineQuery({
  user: async (_, { id }) => {
    return await db.user.findUnique({ where: { id } })
  }
})
```

**Migration steps:**
1. Find all resolver files:
```bash
find server/graphql -name "*.resolver.ts"
```

2. Convert default exports to named exports:
```bash
# Before
export default defineQuery({ ... })

# After
export const queryName = defineQuery({ ... })
```

3. Test all resolvers

---

#### 4. Configuration Structure Changes

**What's changing:**
Enhanced configuration with new file generation control options.

**Before (v1.x):**
```typescript
// nitro.config.ts
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  modules: ['nitro-graphql'],
  graphql: {
    framework: 'graphql-yoga',
    playground: true,
  },
})
```

**After (v2.x):**
```typescript
// nitro.config.ts
import graphql from 'nitro-graphql'
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  modules: [
    graphql({
      framework: 'graphql-yoga',
      playground: true,

      // New: Fine-grained file generation control
      scaffold: {
        enabled: true,
        graphqlConfig: true,
        serverSchema: true,
        serverConfig: true,
        serverContext: true,
      },

      // New: Custom path configuration
      paths: {
        serverGraphql: 'server/graphql',
        clientGraphql: 'app/graphql',
        typesDir: '.nitro/types',
      },
    }),
  ],
})
```

**Migration steps:**
1. Review your configuration
2. Add new options if you want custom paths
3. Disable scaffold files if needed (library mode)
4. Test configuration

---

### Preparation Checklist

Before upgrading to v2.0:

- [ ] Review breaking changes above
- [ ] Backup your project
- [ ] Convert all default exports to named exports
- [ ] Update to latest v1.x version first
- [ ] Run tests to ensure everything works
- [ ] Document any custom configurations
- [ ] Check for deprecated features in console warnings

---

## Migrating to v1.5

Version 1.5 introduced named exports requirement and file generation improvements.

### Key Changes

#### 1. Named Exports Required

**Change:**
Default exports are deprecated in favor of named exports.

**Migration:**
```typescript
// Before (still works but deprecated)
export default defineQuery({
  user: async (_, { id }) => { ... }
})

// After (recommended)
export const userQueries = defineQuery({
  user: async (_, { id }) => { ... }
})
```

**Why:**
- Better tree-shaking
- Easier debugging
- Clearer module structure
- Multiple exports per file

**Steps:**
1. Update all resolver files to use named exports
2. Use descriptive names (e.g., `userQueries`, `postMutations`)
3. Test all resolvers

---

#### 2. File Generation Control

**New feature:**
Control which files are auto-generated.

**Example:**
```typescript
import graphql from 'nitro-graphql'
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  modules: [
    graphql({
      framework: 'graphql-yoga',
      scaffold: {
        graphqlConfig: false, // Don't generate graphql.config.ts
        serverSchema: true, // Generate server/graphql/schema.ts
        serverConfig: true, // Generate server/graphql/config.ts
        serverContext: false, // Don't generate context.ts
      },
    }),
  ],
})
```

**Benefits:**
- Library mode support
- Custom monorepo structures
- Selective file generation

---

## Migrating to v1.0

Version 1.0 introduced several foundational features.

### Key Changes

#### 1. Auto-Discovery

**Change:**
Automatic schema and resolver discovery.

**Before (manual imports):**
```typescript
// Old approach - manual
import { makeExecutableSchema } from '@graphql-tools/schema'
import { resolvers } from './resolvers'
import { typeDefs } from './schema'

const schema = makeExecutableSchema({ typeDefs, resolvers })
```

**After (auto-discovery):**
```typescript
// New approach - automatic
// Just place files in server/graphql/
// ✅ server/graphql/schema.graphql
// ✅ server/graphql/user.resolver.ts
```

**Migration steps:**
1. Move schema files to `server/graphql/`
2. Rename to `.graphql` extension
3. Move resolvers to `server/graphql/`
4. Rename to `.resolver.ts` extension
5. Remove manual imports

---

#### 2. Type Generation

**Change:**
Automatic TypeScript type generation.

**Before (manual types):**
```typescript
// Manually defined types
interface User {
  id: string
  name: string
}

interface Query {
  user: (id: string) => User
}
```

**After (generated types):**
```typescript
// Use generated types
import type { Resolvers } from '#graphql/server'

export const userQueries: Resolvers['Query'] = {
  user: async (_, { id }) => {
    // Types are automatically inferred
  }
}
```

**Migration steps:**
1. Remove manual type definitions
2. Import from `#graphql/server`
3. Use generated types
4. Restart TypeScript server

---

#### 3. Virtual Imports

**Change:**
Use virtual imports for types.

**Before:**
```typescript
import { Resolvers } from '../.nitro/types/graphql'
```

**After:**
```typescript
import type { GetUserQuery } from '#graphql/client'
import type { Resolvers } from '#graphql/server'
```

**Migration steps:**
1. Update import paths
2. Use `#graphql/server` for server types
3. Use `#graphql/client` for client types
4. Remove relative imports

---

## Common Migration Issues

### Issue: Module Not Found After Upgrade

**Symptoms:**
```bash
Error: Cannot find module 'nitro-graphql'
```

**Solution:**
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Clear build cache
rm -rf .nitro .nuxt .output

# Restart
pnpm dev
```

---

### Issue: Types Not Generating

**Symptoms:**
Import errors for `#graphql/server`

**Solution:**
1. Ensure dev server is running
2. Check schema files exist
3. Clear cache:
```bash
rm -rf .nitro .nuxt
pnpm dev
```
4. Restart TypeScript server

---

### Issue: Resolvers Not Working

**Symptoms:**
Queries return null or errors

**Solution:**
1. Check file naming: must end with `.resolver.ts`
2. Use named exports
3. Match resolver names to schema fields
4. Check debug dashboard: `/api/graphql/debug`

---

### Issue: Configuration Not Applied

**Symptoms:**
Settings not taking effect

**Solution:**
1. Verify module is registered:
```typescript
import graphql from 'nitro-graphql'

export default defineNitroConfig({
  modules: [
    graphql({ framework: 'graphql-yoga' }),
  ],
})
```

2. Check configuration syntax
3. Clear cache:
```bash
rm -rf .nitro .nuxt
```

4. Restart dev server

---

## Version Compatibility

### Nitro GraphQL v1.5.x

**Compatible with:**
- Nitro: `^2.11.0`
- H3: `^1.15.0`
- GraphQL: `^16.11.0`
- Node: `>=18.0.0`

**Not compatible with:**
- Nitro v3 (use v2.0+)
- H3 v2 (use v2.0+)

### Nitro GraphQL v2.0.x (upcoming)

**Compatible with:**
- Nitro: `^3.0.0`
- H3: `^2.0.0`
- GraphQL: `^16.11.0`
- Node: `>=18.0.0`

**Not compatible with:**
- Nitro v2
- H3 v1

---

## Deprecation Timeline

### v1.5.0 (Current)
- ⚠️ Default exports deprecated (warning)
- ✅ Named exports recommended

### v2.0.0 (Upcoming)
- ❌ Default exports removed
- ✅ Named exports required
- ✅ Nitro v3 / H3 v2 support
- ✅ Enhanced file generation control

---

## Migration Testing

### Test Checklist

After migrating, verify:

- [ ] Dev server starts without errors
- [ ] GraphQL playground loads
- [ ] Schema appears correctly
- [ ] Queries execute successfully
- [ ] Mutations work as expected
- [ ] Types are generated
- [ ] Imports resolve correctly
- [ ] Context is accessible
- [ ] External services work (if used)
- [ ] Production build succeeds

### Test Commands

```bash
# Development
pnpm dev

# Access playground
open http://localhost:3000/api/graphql

# Check debug dashboard
open http://localhost:3000/api/graphql/debug

# Run build
pnpm build

# Test production
pnpm preview
```

---

## Getting Help

If you encounter issues during migration:

### 1. Check Documentation
- [Common Issues](/troubleshooting/common-issues)
- [Type Generation Issues](/troubleshooting/type-generation-issues)
- [Debug Mode](/troubleshooting/debug-mode)

### 2. Use Debug Dashboard
```
http://localhost:3000/api/graphql/debug
```

### 3. Review Console Logs
Look for warnings and errors during startup

### 4. Ask for Help
- GitHub Issues: https://github.com/productdevbook/nitro-graphql/issues
- Discussions: https://github.com/productdevbook/nitro-graphql/discussions

### 5. Report Bugs
If you find a migration bug:
1. Check existing issues
2. Create a minimal reproduction
3. Open a new issue with:
   - Current version
   - Target version
   - Error messages
   - Configuration
   - Steps to reproduce

---

## Best Practices

### Before Migrating

1. **Update to latest patch version first**
```bash
# Get latest 1.x version before jumping to 2.x
pnpm update nitro-graphql
```

2. **Review changelog**
Read release notes for your target version

3. **Backup your code**
```bash
git commit -am "Pre-migration backup"
git branch pre-migration-backup
```

4. **Test in development first**
Never migrate directly in production

### During Migration

1. **Migrate incrementally**
- Update dependencies one at a time
- Test after each change
- Commit working states

2. **Follow deprecation warnings**
- Fix warnings before upgrading
- Use console output as guide

3. **Use TypeScript**
- Let compiler catch issues
- Fix type errors before testing

### After Migration

1. **Run full test suite**
```bash
pnpm test
```

2. **Test all features**
- Manual testing in playground
- API integration tests
- Client application testing

3. **Monitor production**
- Deploy to staging first
- Watch for errors
- Monitor performance

4. **Update documentation**
- Update team wiki
- Update README
- Document any custom changes

---

## Rollback Plan

If migration fails, you can rollback:

### Quick Rollback

```bash
# Revert to previous version
git checkout pre-migration-backup

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Clear cache
rm -rf .nitro .nuxt

# Restart
pnpm dev
```

### Package Rollback Only

```bash
# Install specific version
pnpm add nitro-graphql@1.4.0

# Clear cache
rm -rf .nitro .nuxt node_modules/.cache

# Restart
pnpm dev
```

---

## Next Steps

- [Common Issues](/troubleshooting/common-issues) - General troubleshooting
- [Type Generation Issues](/troubleshooting/type-generation-issues) - Type-specific problems
- [Debug Mode](/troubleshooting/debug-mode) - Using the debug dashboard
- [Installation Guide](/guide/installation) - Fresh installation guide

---

## Source
<SourceLinks fn="migrationGuide"/>

## Contributors
<Contributors fn="migrationGuide"/>

## Changelog
<Changelog fn="migrationGuide"/>
