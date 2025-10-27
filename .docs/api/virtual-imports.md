# Virtual Imports API Reference

Complete reference for virtual module imports provided by Nitro GraphQL.

Virtual imports are auto-generated module paths that provide access to types, schemas, resolvers, and configuration at runtime and during development.

---

## Overview

Nitro GraphQL provides two categories of virtual imports:

1. **Public Virtual Imports** - For application code (`#graphql/*`)
2. **Internal Virtual Imports** - For framework internals (`#nitro-internal-virtual/*`)

---

## Public Virtual Imports

### #graphql/server

Server-side GraphQL types for resolver implementation.

**Location**: `.nitro/types/nitro-graphql-server.d.ts` (or `.nuxt/types/`)

#### Primary Exports

```typescript
// Type imports for resolvers
import type {
  MutationResolvers,
  QueryResolvers,
  Resolvers,
  ResolversParentTypes,
  ResolversTypes,
  SubscriptionResolvers
} from '#graphql/server'

// Specific type resolvers
import type {
  CommentResolvers,
  PostResolvers,
  UserResolvers
} from '#graphql/server'

// Field argument types
import type {
  MutationCreateUserArgs,
  QueryUserArgs,
  QueryUsersArgs
} from '#graphql/server'

// Input types
import type {
  CreateUserInput,
  UpdateUserInput,
  UserFilter
} from '#graphql/server'

// Enum types
import type {
  PostStatus,
  UserRole
} from '#graphql/server'

// Scalar types
import type {
  Scalars
} from '#graphql/server'

// Configuration type
import type {
  NPMConfig
} from '#graphql/server'
```

#### Usage Examples

**Typed Resolvers:**

```typescript
import type { MutationResolvers, QueryResolvers } from '#graphql/server'

export const queries: QueryResolvers = defineQuery({
  user: async (_parent, { id }, context) => {
    return await context.db.users.findById(id)
  }
})

export const mutations: MutationResolvers = defineMutation({
  createUser: async (_parent, { input }, context) => {
    return await context.db.users.create(input)
  }
})
```

**Custom Type Resolvers:**

```typescript
import type { PostResolvers, UserResolvers } from '#graphql/server'

export const userTypes: UserResolvers = defineType({
  User: {
    fullName: parent => `${parent.firstName} ${parent.lastName}`,
    posts: async (parent, _args, context) => {
      return await context.db.posts.findByUserId(parent.id)
    }
  }
})
```

**Using ResolversTypes:**

```typescript
import type { ResolversTypes } from '#graphql/server'

// Get specific type from schema
type User = ResolversTypes['User']
type Post = ResolversTypes['Post']

// Use in utility functions
function formatUser(user: User): string {
  return `${user.name} (${user.email})`
}
```

---

### #graphql/client

Client-side GraphQL types for queries and mutations.

**Location**: `.nitro/types/nitro-graphql-client.d.ts` (or `.nuxt/types/`)

#### Primary Exports

```typescript
// Operation types
import type {
  CreateUserMutation,
  CreateUserMutationVariables,
  GetUserQuery,
  GetUserQueryVariables,
  GetUsersQuery,
  GetUsersQueryVariables
} from '#graphql/client'

// Fragment types
import type {
  PostFieldsFragment,
  UserFieldsFragment
} from '#graphql/client'

// Input types (client-side)
import type {
  CreateUserInput,
  UpdatePostInput
} from '#graphql/client'

// SDK (if enabled)
import { getSdk } from '#graphql/client'
```

#### Usage Examples

**Query with Types:**

```typescript
import type { GetUserQuery, GetUserQueryVariables } from '#graphql/client'

async function fetchUser(id: string): Promise<GetUserQuery> {
  const variables: GetUserQueryVariables = { id }

  const response = await $fetch<GetUserQuery>('/api/graphql', {
    method: 'POST',
    body: {
      query: GetUserDocument,
      variables
    }
  })

  return response
}
```

**Mutation with Types:**

```typescript
import type {
  CreateUserMutation,
  CreateUserMutationVariables
} from '#graphql/client'

async function createUser(
  input: CreateUserInput
): Promise<CreateUserMutation> {
  const variables: CreateUserMutationVariables = { input }

  const response = await $fetch<CreateUserMutation>('/api/graphql', {
    method: 'POST',
    body: {
      query: CreateUserDocument,
      variables
    }
  })

  return response
}
```

**Using SDK:**

```typescript
import { getSdk } from '#graphql/client'

// Create SDK with fetcher
const sdk = getSdk(async (query, variables) => {
  const response = await $fetch('/api/graphql', {
    method: 'POST',
    body: { query, variables }
  })
  return response
})

// Use typed methods
const user = await sdk.GetUser({ id: '123' })
//    ^? GetUserQuery

const newUser = await sdk.CreateUser({
  input: { name: 'John', email: 'john@example.com' }
})
//    ^? CreateUserMutation
```

**Fragment Usage:**

```typescript
import type { UserFieldsFragment } from '#graphql/client'

function UserCard(props: { user: UserFieldsFragment }) {
  return (
    <div>
      <h2>{props.user.name}</h2>
      <p>{props.user.email}</p>
    </div>
  )
}
```

---

### #graphql/client/{serviceName}

External service types for specific GraphQL APIs.

**Location**: `.nitro/types/nitro-graphql-client-{serviceName}.d.ts`

#### Primary Exports

```typescript
// Example: Contentful service
import type {
  GetPostQuery,
  GetPostsQuery
} from '#graphql/client/contentful'

// Example: GitHub service
import type {
  GetRepositoriesQuery,
  GetRepositoriesQueryVariables,
  GetViewerQuery,
  GetViewerQueryVariables
} from '#graphql/client/github'

import { getSdk as getContentfulSdk } from '#graphql/client/contentful'

// SDK for external service
import { getSdk } from '#graphql/client/github'
```

#### Usage Examples

**GitHub Service:**

```typescript
import type { GetViewerQuery } from '#graphql/client/github'
import { getSdk } from '#graphql/client/github'

const githubSdk = getSdk(async (query, variables) => {
  return await $fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
    },
    body: { query, variables }
  })
})

async function getGitHubViewer(): Promise<GetViewerQuery> {
  return await githubSdk.GetViewer()
}
```

**Multiple External Services:**

```typescript
import type { GetPostsQuery } from '#graphql/client/contentful'
import type { GetViewerQuery } from '#graphql/client/github'
import { getSdk as getContentfulSdk } from '#graphql/client/contentful'
import { getSdk as getGitHubSdk } from '#graphql/client/github'

// GitHub
const github = getGitHubSdk(githubFetcher)
const viewer = await github.GetViewer()

// Contentful
const contentful = getContentfulSdk(contentfulFetcher)
const posts = await contentful.GetPosts()
```

---

### #graphql/schema

Access to the generated schema definition.

**Location**: `server/graphql/schema.ts`

#### Exports

```typescript
import schema from '#graphql/schema'

// Schema is a Partial<Record<keyof ResolversTypes, StandardSchemaV1>>
// Contains validation schemas for GraphQL types
```

#### Usage Example

```typescript
import schema from '#graphql/schema'

// Runtime validation
if (schema.CreateUserInput) {
  const result = await schema.CreateUserInput['~standard'].validate(input)

  if (result.issues) {
    throw new Error('Validation failed')
  }

  // Use validated result.value
  await createUser(result.value)
}
```

---

## Internal Virtual Imports

These are for framework internal use. You typically won't import these directly in application code.

### #nitro-internal-virtual/server-schemas

Compiled GraphQL schema definitions.

```typescript
// Framework internal use
import { schemas } from '#nitro-internal-virtual/server-schemas'

// Array of loaded schema files
// schemas: Array<{ path: string, def: string }>
```

**Structure:**
```typescript
interface SchemaFile {
  path: string // Absolute file path
  def: string // GraphQL SDL content
}
```

---

### #nitro-internal-virtual/server-resolvers

Compiled resolver modules.

```typescript
// Framework internal use
import { resolvers } from '#nitro-internal-virtual/server-resolvers'

// Array of resolver modules with metadata
// resolvers: Array<{ path: string, resolver: IResolvers, exports: string[] }>
```

**Structure:**
```typescript
interface ResolverModule {
  path: string // Absolute file path
  resolver: IResolvers // Resolver object
  exports: string[] // Named exports from file
}
```

---

### #nitro-internal-virtual/server-directives

Compiled directive definitions.

```typescript
// Framework internal use
import { directives } from '#nitro-internal-virtual/server-directives'

// Array of directive definitions
// directives: Array<{ path: string, directive: DirectiveDefinition }>
```

**Structure:**
```typescript
interface DirectiveModule {
  path: string // Absolute file path
  directive: DirectiveDefinition // Directive config
}
```

---

### #nitro-internal-virtual/graphql-config

User-defined GraphQL server configuration.

```typescript
// Framework internal use
import { importedConfig } from '#nitro-internal-virtual/graphql-config'

// Configuration from server/graphql/config.ts
// Type depends on framework (YogaServerOptions or ApolloServerOptions)
```

**Usage in Routes:**

```typescript
// src/routes/graphql-yoga.ts
import { importedConfig } from '#nitro-internal-virtual/graphql-config'
import defu from 'defu'

const yoga = createYoga(defu({
  schema,
  graphqlEndpoint: '/api/graphql'
}, importedConfig)) // Merge user config
```

---

### #nitro-internal-virtual/module-config

Nitro GraphQL module configuration.

```typescript
// Framework internal use
import { moduleConfig } from '#nitro-internal-virtual/module-config'

// Runtime access to NitroGraphQLOptions
// moduleConfig: NitroGraphQLOptions
```

**Usage Example:**

```typescript
import { moduleConfig } from '#nitro-internal-virtual/module-config'

// Check if federation is enabled
if (moduleConfig.federation?.enabled) {
  // Use federation-specific logic
}
```

---

## Virtual Import Resolution

### How Virtual Imports Work

1. **During Build**: Nitro GraphQL scans your GraphQL files and generates virtual modules
2. **TypeScript**: Virtual paths are mapped in `tsconfig.json` for IDE support
3. **Runtime**: Virtual imports are resolved by Nitro's module resolution system

### TypeScript Configuration

Virtual imports are automatically added to your TypeScript configuration:

```json
{
  "compilerOptions": {
    "paths": {
      "#graphql/server": [".nitro/types/nitro-graphql-server.d.ts"],
      "#graphql/client": [".nitro/types/nitro-graphql-client.d.ts"],
      "#graphql/client/*": [".nitro/types/nitro-graphql-client-*.d.ts"],
      "#graphql/schema": ["server/graphql/schema.ts"]
    }
  }
}
```

### Custom Paths

You can customize virtual import paths using the `paths` configuration:

```typescript
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    paths: {
      typesDir: 'types/generated' // Changes output location
    }
  }
})
```

---

## Best Practices

### 1. Always Use Type Imports

Use `import type` for type-only imports:

```typescript
import type { GetUserQuery } from '#graphql/client'
// ✅ Correct
import type { Resolvers } from '#graphql/server'

// ❌ Avoid (unless you need runtime values)
import { Resolvers } from '#graphql/server'
```

### 2. Leverage Auto-completion

Virtual imports provide full IDE auto-completion:

```typescript
import type { } from '#graphql/server'
//                   ^ Ctrl+Space for all available types
```

### 3. Use Service-Specific Imports

For external services, always use the service-specific import:

```typescript
// ❌ Wrong - Types would conflict
import type { GetViewerQuery as GitHubViewer } from '#graphql/client'
import type { GetPostQuery } from '#graphql/client/contentful'

// ✅ Correct - Clear which service
import type { GetViewerQuery } from '#graphql/client/github'
```

### 4. Don't Import Internal Virtuals

Avoid importing `#nitro-internal-virtual/*` in application code:

```typescript
// ✅ Correct - Use public APIs
import type { Resolvers } from '#graphql/server'

// ❌ Wrong - Internal use only
import { schemas } from '#nitro-internal-virtual/server-schemas'
```

### 5. Check Virtual File Generation

If virtual imports aren't working, verify files are generated:

```bash
# Check server types
ls .nitro/types/nitro-graphql-server.d.ts

# Check client types
ls .nitro/types/nitro-graphql-client.d.ts

# Check external service types
ls .nitro/types/nitro-graphql-client-*.d.ts
```

---

## Troubleshooting

### Import Not Found

**Problem**: `Cannot find module '#graphql/server'`

**Solutions**:
1. Ensure the module is installed and built: `pnpm install && pnpm build`
2. Check if types are generated: `ls .nitro/types/`
3. Restart TypeScript server in your IDE
4. Check `tsconfig.json` for correct path mappings

### Types Not Updating

**Problem**: Changes to GraphQL files don't update types

**Solutions**:
1. Restart dev server: `pnpm dev`
2. Manually trigger type generation: Touch a `.graphql` file
3. Check file watcher is running (console should show watch events)
4. Clear build cache: `rm -rf .nitro && pnpm dev`

### Wrong Types Generated

**Problem**: Generated types don't match expectations

**Solutions**:
1. Check codegen configuration in `nitro.config.ts`
2. Verify GraphQL schema is valid
3. Check for conflicting type names
4. Review scalar mappings in config

### External Service Types Missing

**Problem**: `#graphql/client/{serviceName}` not found

**Solutions**:
1. Verify service is configured in `externalServices`
2. Check if documents are specified and exist
3. Ensure schema download succeeded
4. Check `.nitro/graphql/schemas/` for downloaded schemas

---

## IDE Support

### VSCode

Install GraphQL extension for syntax highlighting:

```json
{
  "recommendations": [
    "graphql.vscode-graphql",
    "graphql.vscode-graphql-syntax"
  ]
}
```

### WebStorm / IntelliJ

GraphQL support is built-in. Virtual imports are automatically recognized via `tsconfig.json`.

### Type-Checking

Run TypeScript compiler to verify virtual imports:

```bash
# Check types
pnpm exec tsc --noEmit

# Watch mode
pnpm exec tsc --noEmit --watch
```
