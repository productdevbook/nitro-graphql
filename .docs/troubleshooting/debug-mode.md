# Debug Mode

Using the built-in debug dashboard to troubleshoot and inspect your GraphQL setup.

## Overview

Nitro GraphQL includes a powerful debug dashboard accessible at `/api/graphql/debug` during development. This tool provides deep insights into your GraphQL configuration, schema, resolvers, and virtual file system.

## Accessing the Debug Dashboard

### Local Development
```
http://localhost:3000/api/graphql/debug
```

### Custom Port
```
http://localhost:[YOUR_PORT]/api/graphql/debug
```

### Availability
The debug dashboard is **automatically enabled in development** and **disabled in production** for security.

---

## Dashboard Features

### 1. Configuration Overview

**What it shows:**
- Active framework (GraphQL Yoga or Apollo Server)
- Module configuration
- Enabled features
- Path configurations
- External services setup

**How to use:**
1. Navigate to the "Configuration" tab
2. Review active settings
3. Verify paths are correct
4. Check external services configuration

**Common issues to spot:**
- Wrong framework selected
- Incorrect paths
- Disabled features you expected to be enabled
- Missing external service configuration

**Example output:**
```json
{
  "framework": "graphql-yoga",
  "playground": true,
  "paths": {
    "serverGraphql": "server/graphql",
    "clientGraphql": "app/graphql",
    "buildDir": ".nuxt"
  },
  "scaffold": {
    "enabled": true,
    "graphqlConfig": true,
    "serverSchema": true
  }
}
```

---

### 2. Schema Inspection

**What it shows:**
- Complete merged GraphQL schema
- Type definitions
- Query and mutation fields
- Custom types and scalars
- Directives

**How to use:**
1. Navigate to the "Schema" tab
2. Search for specific types or fields
3. Verify schema merging worked correctly
4. Check for missing or duplicate types

**Common issues to spot:**
- Types not appearing (file not discovered)
- Duplicate type definitions
- Missing Query or Mutation types
- Incorrect field types

**Example inspection:**
```graphql
type Query {
  user(id: ID!): User
  posts(first: Int!, after: String): PostConnection!
}

type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}
```

**Troubleshooting with schema view:**

**Problem:** User type not showing
```
✓ Check: Are .graphql files in server/graphql/?
✓ Check: Is the schema file properly formatted?
✓ Check: Did you save the file?
✓ Check: Is the dev server watching for changes?
```

---

### 3. Resolver Mapping

**What it shows:**
- Discovered resolver files
- Exported resolver functions
- Resolver-to-field mapping
- Resolver file paths

**How to use:**
1. Navigate to the "Resolvers" tab
2. Check which resolvers were discovered
3. Verify resolver names match schema fields
4. Review resolver file paths

**Common issues to spot:**
- Resolver file not discovered (wrong naming)
- Using default exports instead of named exports
- Resolver names don't match schema fields
- TypeScript compilation errors preventing discovery

**Example output:**
```json
{
  "resolvers": [
    {
      "file": "/server/graphql/user.resolver.ts",
      "exports": ["userQueries", "userMutations"],
      "fields": {
        "Query": ["user", "users"],
        "Mutation": ["createUser", "updateUser"]
      }
    }
  ]
}
```

**Troubleshooting tips:**

**Problem:** Resolver not found
```typescript
// ❌ Wrong - default export
export default defineQuery({ ... })

// ✅ Correct - named export
export const userQueries = defineQuery({ ... })
```

**Problem:** Resolver name mismatch
```graphql
# schema.graphql
type Query {
  getUser(id: ID!): User  # Field name: getUser
}
```

```typescript
// ❌ Wrong - doesn't match
export const userQueries = defineQuery({
  user: async (_, { id }) => { ... }  // Field name: user
})

// ✅ Correct - matches schema
export const userQueries = defineQuery({
  getUser: async (_, { id }) => { ... }
})
```

---

### 4. Virtual File System (VFS) Inspection

**What it shows:**
- All auto-generated virtual files
- Virtual module contents
- Import paths
- File generation status

**How to use:**
1. Navigate to the "VFS" tab
2. Browse virtual modules
3. View file contents
4. Verify imports are correct

**Virtual modules available:**
- `#nitro-internal-virtual/server-schemas` - Loaded schemas
- `#nitro-internal-virtual/server-resolvers` - Loaded resolvers
- `#nitro-internal-virtual/server-directives` - Loaded directives
- `#nitro-internal-virtual/graphql-config` - GraphQL configuration

**Example VFS content:**
```typescript
// #nitro-internal-virtual/server-schemas
export const schemas = [
  `type Query {
    user(id: ID!): User
    users: [User!]!
  }

  type User {
    id: ID!
    name: String!
  }`
]
```

**Troubleshooting with VFS:**

**Problem:** Schema not in VFS
- Check if file exists in `server/graphql/`
- Verify file extension is `.graphql`
- Ensure file is not in `.gitignore`
- Check file permissions

**Problem:** Resolver not in VFS
- Verify file ends with `.resolver.ts`
- Check for TypeScript compilation errors
- Ensure named exports are used
- Review file path

---

### 5. Type Definitions Preview

**What it shows:**
- Generated server types
- Generated client types
- Type generation status
- Type file paths

**How to use:**
1. Navigate to the "Types" tab
2. Preview generated types
3. Check for type errors
4. Verify type completeness

**Example type preview:**
```typescript
// Server types (#graphql/server)
export interface Query {
  user: (args: { id: string }) => User | null
  users: () => User[]
}

export interface User {
  id: string
  name: string
  email: string
}

// Client types (#graphql/client)
export interface GetUserQueryVariables {
  id: string
}

export interface GetUserQuery {
  user: {
    id: string
    name: string
    email: string
  } | null
}
```

**Troubleshooting tips:**

**Problem:** Types not generated
1. Check if schemas exist
2. Verify dev server is running
3. Look for type generation errors in console
4. Check configuration (types.enabled)

**Problem:** Types outdated
1. Save schema file to trigger regeneration
2. Restart dev server
3. Clear build cache: `rm -rf .nitro .nuxt`
4. Restart TypeScript server in IDE

---

## Debug Workflows

### Debugging Schema Issues

**Step 1: Verify file discovery**
```bash
# Check files are in correct location
ls server/graphql/*.graphql

# Should see your schema files
```

**Step 2: Check debug dashboard**
1. Open `/api/graphql/debug`
2. Go to "Schema" tab
3. Search for your type

**Step 3: Inspect VFS**
1. Go to "VFS" tab
2. Check `#nitro-internal-virtual/server-schemas`
3. Verify your schema is loaded

**Step 4: Check console**
```bash
# Look for schema loading messages
ℹ Loading schema: server/graphql/user.graphql
✔ Merged 3 schema files
```

---

### Debugging Resolver Issues

**Step 1: Verify file naming**
```bash
# File must end with .resolver.ts
ls server/graphql/*.resolver.ts
```

**Step 2: Check exports**
```typescript
// Must use named exports
export const userQueries = defineQuery({ ... })
```

**Step 3: Check debug dashboard**
1. Open `/api/graphql/debug`
2. Go to "Resolvers" tab
3. Verify your resolver is listed
4. Check field mappings

**Step 4: Test in playground**
```graphql
query {
  user(id: "1") {
    id
    name
  }
}
```

**Step 5: Check console logs**
```bash
# Add logging to resolver
export const userQueries = defineQuery({
  user: async (_, { id }) => {
    console.log('Fetching user:', id)
    return await db.user.findUnique({ where: { id } })
  }
})
```

---

### Debugging Type Generation

**Step 1: Check configuration**
```typescript
// nitro.config.ts
graphql: {
  types: {
    enabled: true,  // ✓ Should be true
    server: true,
    client: true
  }
}
```

**Step 2: Verify files generated**
```bash
# For Nitro
ls .nitro/types/nitro-graphql-*.d.ts

# For Nuxt
ls .nuxt/types/nitro-graphql-*.d.ts
```

**Step 3: Check debug dashboard**
1. Open `/api/graphql/debug`
2. Go to "Types" tab
3. Preview generated types
4. Check for errors

**Step 4: Force regeneration**
```bash
rm -rf .nitro .nuxt
pnpm dev
```

---

### Debugging External Services

**Step 1: Check configuration**
```typescript
externalServices: [
  {
    name: 'github',
    schema: 'https://api.github.com/graphql',
    endpoint: 'https://api.github.com/graphql',
    headers: () => ({
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
    }),
    documents: ['app/graphql/github/**/*.graphql']
  }
]
```

**Step 2: Test connectivity**
```bash
# Test if schema URL is accessible
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/graphql
```

**Step 3: Check debug dashboard**
1. Open `/api/graphql/debug`
2. Go to "Configuration" tab
3. Verify external service listed
4. Check schema download status

**Step 4: Verify query files**
```bash
# Check query files exist
ls app/graphql/github/*.graphql
```

**Step 5: Check generated types**
```bash
# Should see external service types
ls .nitro/types/nitro-graphql-client-github.d.ts
```

---

## Debug Console Logging

### Enable Verbose Logging

```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    debug: true // Enable debug mode
  }
})
```

**Console output examples:**

**Schema loading:**
```
ℹ Scanning for schemas in server/graphql
✔ Found 3 schema files
ℹ Loading schema: server/graphql/user.graphql
ℹ Loading schema: server/graphql/post.graphql
✔ Merged schemas successfully
```

**Resolver discovery:**
```
ℹ Scanning for resolvers in server/graphql
✔ Found 2 resolver files
ℹ Loading resolver: server/graphql/user.resolver.ts
  → Exported: userQueries, userMutations
✔ Loaded 5 resolvers
```

**Type generation:**
```
ℹ Generating server types...
✔ Generated server types at .nitro/types/nitro-graphql-server.d.ts
ℹ Generating client types...
✔ Generated client types at .nitro/types/nitro-graphql-client.d.ts
```

---

## Common Debug Scenarios

### Scenario 1: Schema not showing in playground

**Debug steps:**
1. Check debug dashboard → Schema tab
2. If empty: Check console for schema loading errors
3. Verify files in `server/graphql/` with `.graphql` extension
4. Check VFS tab for loaded schemas
5. Restart dev server

### Scenario 2: Resolver returns null

**Debug steps:**
1. Check debug dashboard → Resolvers tab
2. Verify resolver is discovered
3. Check resolver name matches schema field
4. Add console.log to resolver
5. Test query in playground
6. Check console output

### Scenario 3: Types not autocompleting

**Debug steps:**
1. Check debug dashboard → Types tab
2. Verify types are generated
3. Check file exists: `.nitro/types/nitro-graphql-server.d.ts`
4. Restart TypeScript server in IDE
5. Check tsconfig.json extends correct file
6. Clear cache and regenerate

### Scenario 4: External service not working

**Debug steps:**
1. Check debug dashboard → Configuration tab
2. Verify external service configuration
3. Test schema URL with curl
4. Check environment variables
5. Verify query files exist
6. Check generated types exist

---

## Debug Dashboard API

You can also access debug information programmatically:

```typescript
// GET /api/graphql/debug/config
// Returns current configuration

// GET /api/graphql/debug/schema
// Returns merged schema

// GET /api/graphql/debug/resolvers
// Returns resolver mapping

// GET /api/graphql/debug/vfs
// Returns virtual file system contents

// GET /api/graphql/debug/types
// Returns type generation status
```

**Example usage:**
```typescript
// Fetch debug info in tests or scripts
const config = await fetch('http://localhost:3000/api/graphql/debug/config')
const data = await config.json()
console.log(data)
```

---

## Production Debugging

The debug dashboard is **disabled in production** for security. For production debugging:

### 1. Use Health Check Endpoint
```
GET /api/graphql/health
```

Returns:
```json
{
  "status": "ok",
  "framework": "graphql-yoga",
  "version": "1.5.0"
}
```

### 2. Enable Logging
```typescript
// server/graphql/config.ts
export default defineGraphQLConfig({
  maskedErrors: process.env.NODE_ENV === 'production',
  formatError: (error) => {
    // Log errors to external service
    console.error('GraphQL Error:', {
      message: error.message,
      path: error.path,
      extensions: error.extensions
    })

    return error
  }
})
```

### 3. Use GraphQL Introspection
```graphql
# Query schema programmatically
query IntrospectionQuery {
  __schema {
    types {
      name
      kind
      fields {
        name
        type { name }
      }
    }
  }
}
```

### 4. Monitor Performance
```typescript
import { useResponseCache } from '@envelop/response-cache'

export default defineGraphQLConfig({
  plugins: [
    useResponseCache({
      onCacheHit: () => console.log('Cache hit'),
      onCacheMiss: () => console.log('Cache miss')
    })
  ]
})
```

---

## Next Steps

- [Common Issues](/troubleshooting/common-issues) - General troubleshooting
- [Type Generation Issues](/troubleshooting/type-generation-issues) - Type-specific problems
- [Performance Issues](/troubleshooting/performance-issues) - Optimization guide
- [Debug Dashboard Guide](/guide/debug-dashboard) - Complete feature overview
