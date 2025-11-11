# Common Issues

Frequently encountered problems and their solutions when working with Nitro GraphQL.

## Module Not Found Errors

### Problem: Cannot find module 'nitro-graphql'

**Symptoms:**
```bash
Error: Cannot find module 'nitro-graphql'
```

**Common Causes:**
1. Package not installed or installed incorrectly
2. Wrong package manager used
3. Monorepo workspace configuration issues
4. Stale `node_modules` or lock files

**Solutions:**

1. **Verify Installation:**
```bash
# Check if package is installed
pnpm list nitro-graphql

# If not installed, install it
pnpm add nitro-graphql
```

2. **Clean Install:**
```bash
# Remove node_modules and lock files
rm -rf node_modules pnpm-lock.yaml

# Clear pnpm cache (optional)
pnpm store prune

# Reinstall dependencies
pnpm install
```

3. **Check Package Manager:**
Nitro GraphQL requires pnpm. Ensure you're using the correct version:
```bash
# Check version
pnpm --version

# Should be >= 9.0.0
# Install/update if needed
npm install -g pnpm@latest
```

4. **Monorepo Setup:**
If using a monorepo, ensure proper workspace configuration in `pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Prevention Tips:**
- Always use pnpm as specified in the project
- Keep dependencies up to date
- Use `.npmrc` to enforce package manager
- Document setup requirements for team members

---

## Schema Not Loading

### Problem: GraphQL schema is empty or not found

**Symptoms:**
- Empty schema in GraphQL playground
- "Query root type must be provided" error
- Schema changes not reflected

**Common Causes:**
1. Incorrect file naming or location
2. Invalid GraphQL syntax in schema files
3. File watching not triggered
4. Build cache issues

**Solutions:**

1. **Verify File Location:**
```bash
# For Nitro projects
# Files should be in: server/graphql/**/*.graphql

# For Nuxt projects
# Files should be in: server/graphql/**/*.graphql
```

2. **Check File Naming:**
Schema files must end with `.graphql`:
```bash
✅ server/graphql/schema.graphql
✅ server/graphql/user/user.schema.graphql
❌ server/graphql/schema.gql
❌ server/graphql/user.ts
```

3. **Validate Schema Syntax:**
```graphql
# Valid schema
type Query {
  hello: String!
}

# Invalid - missing Query type
type User {
  id: ID!
}
```

4. **Force Schema Reload:**
```bash
# Stop dev server
# Remove build cache
rm -rf .nitro .nuxt

# Restart dev server
pnpm dev
```

5. **Check Auto-Discovery:**
Use the debug dashboard to verify schema discovery:
```
http://localhost:3000/api/graphql/debug
```

**Prevention Tips:**
- Use consistent file naming conventions
- Validate schema syntax with IDE extensions
- Keep schema files organized by domain
- Use the debug dashboard regularly during development

---

## Resolver Not Found

### Problem: Resolvers not being discovered or executed

**Symptoms:**
- "Cannot return null for non-nullable field" errors
- Queries return null unexpectedly
- Mutations not executing

**Common Causes:**
1. Incorrect resolver file naming
2. Using default exports instead of named exports
3. Resolver not matching schema fields
4. TypeScript compilation errors

**Solutions:**

1. **Verify File Naming:**
Resolver files must end with `.resolver.ts`:
```bash
✅ server/graphql/user.resolver.ts
✅ server/graphql/queries/user.resolver.ts
❌ server/graphql/user.ts
❌ server/graphql/resolvers/user.ts
```

2. **Use Named Exports (Required in v1.5+):**
```typescript
// ✅ Correct - Named exports
export const userQueries = defineQuery({
  user: async (_, { id }) => {
    return await db.user.findUnique({ where: { id } })
  }
})

// ❌ Deprecated - Default exports
export default defineQuery({
  user: async (_, { id }) => {
    return await db.user.findUnique({ where: { id } })
  }
})
```

3. **Match Schema Field Names:**
```graphql
# schema.graphql
type Query {
  getUser(id: ID!): User
}
```

```typescript
// user.resolver.ts
export const userQueries = defineQuery({
  // ✅ Field name matches schema
  getUser: async (_, { id }) => { /* ... */ }

  // ❌ Field name doesn't match
  user: async (_, { id }) => { /* ... */ }
})
```

4. **Check TypeScript Errors:**
```bash
# Look for compilation errors
pnpm build

# Or check in your IDE
# Ensure no TypeScript errors in resolver files
```

5. **Verify in Debug Dashboard:**
```
http://localhost:3000/api/graphql/debug
```
Check the "Resolvers" section to see discovered resolvers.

**Prevention Tips:**
- Always use named exports
- Keep resolver field names in sync with schema
- Use TypeScript strict mode for better type checking
- Leverage generated types from `#graphql/server`

---

## Import Path Errors

### Problem: Cannot resolve virtual imports

**Symptoms:**
```typescript
// Error: Cannot find module '#graphql/server'
import type { Resolvers } from '#graphql/server'
```

**Common Causes:**
1. Types not yet generated
2. Dev server not running
3. IDE not recognizing virtual imports
4. Build process incomplete

**Solutions:**

1. **Ensure Dev Server is Running:**
```bash
# Start dev server to trigger type generation
pnpm dev
```

2. **Verify Generated Types Exist:**
```bash
# For Nitro projects
ls .nitro/types/nitro-graphql-*.d.ts

# For Nuxt projects
ls .nuxt/types/nitro-graphql-*.d.ts
```

3. **Restart TypeScript Server (VS Code):**
- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- Type "TypeScript: Restart TS Server"
- Press Enter

4. **Check TypeScript Configuration:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "#graphql/server": ["./.nitro/types/nitro-graphql-server.d.ts"],
      "#graphql/client": ["./.nitro/types/nitro-graphql-client.d.ts"]
    }
  }
}
```

5. **Force Type Regeneration:**
```bash
# Remove build directory
rm -rf .nitro .nuxt

# Restart dev server
pnpm dev
```

**Prevention Tips:**
- Always run dev server during development
- Add build directories to `.gitignore`
- Restart IDE/TS server after major changes
- Use IDE extensions for better virtual module support

---

## Configuration Not Applied

### Problem: Module configuration not taking effect

**Symptoms:**
- Framework setting ignored
- Custom paths not working
- Features not enabled/disabled as expected

**Common Causes:**
1. Configuration in wrong file
2. Invalid configuration syntax
3. Module not registered
4. Configuration cache

**Solutions:**

1. **Verify Module Registration:**

For Nitro:
```typescript
// nitro.config.ts
export default defineNitroConfig({
  modules: ['nitro-graphql'], // ✅ Must be registered
  graphql: {
    framework: 'graphql-yoga'
  }
})
```

For Nuxt:
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nitro-graphql'], // ✅ Must be registered
  graphql: {
    framework: 'graphql-yoga'
  }
})
```

2. **Check Configuration Syntax:**
```typescript
// ✅ Correct
graphql: {
  framework: 'graphql-yoga',
  playground: true
}

// ❌ Wrong - typo in framework name
graphql: {
  framework: 'yoga', // Should be 'graphql-yoga'
  playground: true
}
```

3. **Clear Build Cache:**
```bash
rm -rf .nitro .nuxt node_modules/.cache
pnpm dev
```

4. **Validate Configuration:**
Use the debug dashboard to see active configuration:
```
http://localhost:3000/api/graphql/debug
```

**Prevention Tips:**
- Use TypeScript for config files to get autocomplete
- Validate configuration syntax carefully
- Check debug dashboard to confirm settings
- Document custom configuration for team

---

## Playground/GraphiQL Not Loading

### Problem: GraphQL playground is not accessible

**Symptoms:**
- 404 error at `/api/graphql`
- Blank page when accessing playground
- "Cannot GET /api/graphql" error

**Common Causes:**
1. Playground disabled in configuration
2. Wrong URL or port
3. Server not fully started
4. Production mode

**Solutions:**

1. **Verify Playground is Enabled:**
```typescript
// nitro.config.ts or nuxt.config.ts
export default defineNitroConfig({
  graphql: {
    playground: true // ✅ Must be true in development
  }
})
```

2. **Check Correct URL:**
```bash
# Default URL
http://localhost:3000/api/graphql

# Custom port
http://localhost:[YOUR_PORT]/api/graphql
```

3. **Wait for Server Startup:**
Look for console message:
```
ℹ GraphQL server ready at http://localhost:3000/api/graphql
```

4. **Check Environment:**
```bash
# Playground is auto-disabled in production
echo $NODE_ENV

# Force enable for testing
NODE_ENV=development pnpm dev
```

5. **Framework-Specific Settings:**

For GraphQL Yoga (default):
- Playground includes GraphiQL interface
- Available at `/api/graphql`

For Apollo Server:
- Apollo Sandbox automatically loads
- Available at `/api/graphql`

**Prevention Tips:**
- Keep playground enabled in development
- Use environment variables for production config
- Document custom endpoints in README
- Add health check endpoint: `/api/graphql/health`

---

## Context Not Available

### Problem: Context is undefined or missing properties

**Symptoms:**
```typescript
// Error: Cannot read property 'db' of undefined
const user = await context.db.user.findUnique()
```

**Common Causes:**
1. Context not properly defined
2. Missing context augmentation
3. Incorrect context access
4. TypeScript types not updated

**Solutions:**

1. **Define Context Types:**
```typescript
// server/graphql/context.ts
import type { H3Event } from 'h3'

declare module 'h3' {
  interface H3EventContext {
    db: Database
    user?: User
  }
}
```

2. **Access Context Correctly:**
```typescript
// ✅ Correct - context is third parameter
export const userQueries = defineQuery({
  user: async (_, { id }, context) => {
    return await context.db.user.findUnique({ where: { id } })
  }
})

// ❌ Wrong - trying to access from wrong parameter
export const userQueries = defineQuery({
  user: async (_, { id, context }) => { // Wrong!
    return await context.db.user.findUnique({ where: { id } })
  }
})
```

3. **Ensure Context File Exists:**
```bash
# Should exist after first run
ls server/graphql/context.ts
```

4. **Restart TypeScript Server:**
After updating context types, restart your IDE's TypeScript server.

**Prevention Tips:**
- Always define context types in `context.ts`
- Use generated types for type safety
- Document custom context properties
- Initialize context properly in config

---

## Hot Reload Not Working

### Problem: Changes to schema/resolvers not reflecting

**Symptoms:**
- Schema changes require manual server restart
- New resolvers not discovered
- File changes not triggering rebuild

**Common Causes:**
1. File watcher issues
2. Files outside watched directories
3. Editor saving files incorrectly
4. Build cache stale

**Solutions:**

1. **Verify File Location:**
Ensure files are in watched directories:
```
server/graphql/**/*.graphql
server/graphql/**/*.resolver.ts
```

2. **Check File Watcher:**
```bash
# If using WSL or Docker, may need polling
pnpm dev
# Look for "watching for file changes" message
```

3. **Manual Restart:**
```bash
# Stop server (Ctrl+C)
# Clear cache
rm -rf .nitro .nuxt
# Restart
pnpm dev
```

4. **Editor Configuration:**
Some editors (like VS Code with certain settings) may not trigger watchers properly:
```json
// VS Code settings.json
{
  "files.watcherExclude": {
    "**/node_modules/**": false
  }
}
```

**Prevention Tips:**
- Keep files in standard directories
- Use reliable editors with proper file saving
- Clear cache periodically
- Monitor console for watcher messages

---

## Dependency Conflicts

### Problem: Version conflicts with peer dependencies

**Symptoms:**
```bash
WARN: Unmet peer dependency
Error: Cannot find module 'graphql'
```

**Common Causes:**
1. Missing peer dependencies
2. Version mismatches
3. Multiple versions installed
4. Incorrect package manager

**Solutions:**

1. **Install Required Peer Dependencies:**
```bash
# Minimum required
pnpm add graphql h3 nitropack

# For Apollo Server
pnpm add @apollo/server @apollo/utils.withrequired graphql
```

2. **Check Version Compatibility:**
```json
// package.json
{
  "dependencies": {
    "graphql": "^16.11.0",
    "h3": "^1.15.3",
    "nitropack": "^2.11.13"
  }
}
```

3. **Resolve Version Conflicts:**
```bash
# Check for duplicate packages
pnpm list graphql

# Force single version if needed
pnpm dedupe
```

4. **Clean Install:**
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Prevention Tips:**
- Keep dependencies updated regularly
- Use exact versions for peer dependencies
- Document required dependencies in README
- Test after dependency updates

---

## Next Steps

- [Type Generation Issues](/troubleshooting/type-generation-issues) - Type-specific problems
- [Performance Issues](/troubleshooting/performance-issues) - Optimization guide
- [Debug Mode](/troubleshooting/debug-mode) - Using the debug dashboard
- [Migration Guide](/troubleshooting/migration-guide) - Upgrading between versions
