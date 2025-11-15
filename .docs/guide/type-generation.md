---
title: Type Generation
category: Guide
---

# Type Generation

<FunctionInfo fn="typeGeneration"/>

Automatic TypeScript type generation for server-side resolvers and client-side queries.

## Overview

Nitro GraphQL automatically generates TypeScript types from your GraphQL schemas:

- **Server Types**: Use in resolvers and server code
- **Client Types**: Use in frontend components and queries
- **External Service Types**: For third-party GraphQL APIs

## Server Types

### Location

Generated at:
- **Nitro**: `.nitro/types/nitro-graphql-server.d.ts`
- **Nuxt**: `.nuxt/types/nitro-graphql-server.d.ts`

### Import Path

```ts
import type { Mutation, Post, Query, Resolvers, User } from '#graphql/server'
```

### Generated Types

From this schema:

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
}

input CreateUserInput {
  name: String!
  email: String!
}

type Query {
  users: [User!]!
  user(id: ID!): User
}

type Mutation {
  createUser(input: CreateUserInput!): User!
}
```

Generated types:

```ts
// Object types
export interface User {
  id: string
  name: string
  email: string
  posts: Post[]
}

export interface Post {
  id: string
  title: string
  content: string
}

// Input types
export interface CreateUserInput {
  name: string
  email: string
}

// Query types
export interface Query {
  users: User[]
  user?: User | null
}

// Mutation types
export interface Mutation {
  createUser: User
}

// Resolver types
export interface Resolvers {
  Query?: QueryResolvers
  Mutation?: MutationResolvers
  User?: UserResolvers
  Post?: PostResolvers
}
```

### Using Server Types

In resolvers:

```ts
import { defineMutation } from 'nitro-graphql/utils'
import type { CreateUserInput, User } from '#graphql/server'

export const userMutations = defineMutation({
  createUser: async (
    parent,
    { input }: { input: CreateUserInput }
  ): Promise<User> => {
    const user: User = {
      id: Date.now().toString(),
      name: input.name,
      email: input.email,
      posts: [],
    }
    return user
  },
})
```

In other server files:

```ts
// server/utils/user-service.ts
import type { User } from '#graphql/server'

export async function findUser(id: string): Promise<User | null> {
  // Implementation
  return null
}
```

## Client Types

### Location

Generated at:
- **Nitro**: `.nitro/types/nitro-graphql-client.d.ts`
- **Nuxt**: `.nuxt/types/nitro-graphql-client.d.ts`

### Import Path

```ts
import type { CreateUserMutation, GetUsersQuery } from '#graphql/client'
```

### How It Works

Client types are generated from your `.graphql` query files:

```graphql
# app/graphql/users/get-users.graphql
query GetUsers {
  users {
    id
    name
    email
  }
}
```

Generated type:

```ts
export interface GetUsersQuery {
  users: Array<{
    id: string
    name: string
    email: string
  }>
}
```

### Using Client Types

In Vue components:

```vue
<script setup lang="ts">
import type { GetUsersQuery } from '#graphql/client'

// useGraphql() is auto-imported in Nuxt
const { GetUsers } = useGraphql()

// Fully typed response
const { data } = await useAsyncData<GetUsersQuery>('users', () =>
  GetUsers()
)

// data.value?.users is typed as User[]
</script>

<template>
  <div v-for="user in data?.users" :key="user.id">
    {{ user.name }}
  </div>
</template>
```

### Query with Variables

```graphql
# app/graphql/users/get-user.graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    posts {
      id
      title
    }
  }
}
```

Generated types:

```ts
export interface GetUserQueryVariables {
  id: string
}

export interface GetUserQuery {
  user?: {
    id: string
    name: string
    email: string
    posts: Array<{
      id: string
      title: string
    }>
  } | null
}
```

Usage:

```vue
<script setup lang="ts">
import type { GetUserQuery, GetUserQueryVariables } from '#graphql/client'

// useGraphql() is auto-imported in Nuxt
const { GetUser } = useGraphql()

const userId = ref('1')

const { data } = await useAsyncData<GetUserQuery>(
  'user',
  () => GetUser({ id: userId.value })
)
</script>
```

### Mutation Types

```graphql
# app/graphql/users/create-user.graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
  }
}
```

Generated:

```ts
export interface CreateUserMutationVariables {
  input: CreateUserInput
}

export interface CreateUserMutation {
  createUser: {
    id: string
    name: string
    email: string
  }
}
```

Usage:

```ts
// useGraphql() is auto-imported in Nuxt
const { CreateUser } = useGraphql()

const newUser = await CreateUser({
  input: {
    name: 'John Doe',
    email: 'john@example.com',
  }
})
// newUser is typed as CreateUserMutation
```

## External Service Types

### Configuration

```ts
// nuxt.config.ts
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  nitro: {
    graphql: {
      framework: 'graphql-yoga',
      externalServices: [
        {
          name: 'github',
          schema: 'https://api.github.com/graphql',
          endpoint: 'https://api.github.com/graphql',
          documents: ['app/graphql/github/**/*.graphql'],
        },
      ],
    },
  },
})
```

### Generated Types

Location: `.nuxt/types/nitro-graphql-client-github.d.ts`

Import path:

```ts
import type {
  GetRepositoryQuery,
  SearchRepositoriesQuery
} from '#graphql/client/github'
```

### Using External Types

```graphql
# app/graphql/github/get-repository.graphql
query GetRepository($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    id
    name
    description
    stargazerCount
  }
}
```

```vue
<script setup lang="ts">
import type { GetRepositoryQuery } from '#graphql/client/github'

// useGraphql() is auto-imported in Nuxt
const { github } = useGraphql()

const { data } = await useAsyncData<GetRepositoryQuery>(
  'repo',
  () => github.GetRepository({
    owner: 'unjs',
    name: 'nitro'
  })
)
</script>

<template>
  <div v-if="data?.repository">
    <h1>{{ data.repository.name }}</h1>
    <p>{{ data.repository.description }}</p>
    <p>⭐ {{ data.repository.stargazerCount }}</p>
  </div>
</template>
```

## Type Generation Configuration

### Disable Type Generation

```ts
// nitro.config.ts
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    types: {
      server: false, // Don't generate server types
      client: false, // Don't generate client types
      external: false, // Don't generate external service types
    },
  },
})
```

### Custom Type Paths

```ts
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    types: {
      server: 'types/graphql-server.d.ts',
      client: 'types/graphql-client.d.ts',
      external: 'types/graphql-{serviceName}.d.ts',
    },
  },
})
```

## Advanced Type Usage

### Resolver Type Safety

Full type safety in resolvers:

```ts
import { defineResolver } from 'nitro-graphql/utils'
import type { Resolvers } from '#graphql/server'

// Fully typed resolver map
const resolvers: Resolvers = {
  Query: {
    users: async () => {
      // Return type is inferred as User[]
      return []
    },
    user: async (_, { id }) => {
      // id is typed as string
      // Return type is User | null
      return null
    },
  },
  User: {
    posts: async (parent) => {
      // parent is typed as User
      // Return type is Post[]
      return []
    },
  },
}
```

### Context Typing

Extend context with custom types:

```ts
// server/graphql/context.ts
declare module 'h3' {
  interface H3EventContext {
    db: Database
    auth?: {
      userId: string
      role: string
    }
  }
}
```

Use in resolvers:

```ts
import { defineQuery } from 'nitro-graphql/utils'

export const userQueries = defineQuery({
  users: async (parent, args, context) => {
    // context.db is typed
    // context.auth is typed
    return await context.db.user.findMany()
  },
})
```

### Partial Types

For field resolvers, use partial parent types:

```ts
import { defineType } from 'nitro-graphql/utils'
import type { Post, User } from '#graphql/server'

export const postTypes = defineType({
  Post: {
    author: async (parent: Pick<Post, 'authorId'>) => {
      // parent only needs authorId field
      const user: User = await findUser(parent.authorId)
      return user
    },
  },
})
```

## Type Generation Triggers

Types are regenerated when:

1. **Dev server starts** - Initial type generation
2. **Schema files change** - `.graphql` files in `server/graphql/`
3. **Client query files change** - `.graphql` files in `app/graphql/`
4. **Config changes** - `nitro.config.ts` or `nuxt.config.ts`

::: tip Manual Regeneration
Restart the dev server to force type regeneration:

```bash
# Stop server (Ctrl+C)
pnpm dev
```
:::

## Troubleshooting

### Types not generating

**Check**:
1. Files are in correct directories
2. File extensions are correct (`.graphql`, `.resolver.ts`)
3. No GraphQL syntax errors
4. Restart dev server

**Verify**:
```bash
# Check if types file exists
ls -la .nitro/types/nitro-graphql-server.d.ts
ls -la .nuxt/types/nitro-graphql-server.d.ts
```

### Import errors

**Problem**: `Cannot find module '#graphql/server'`

**Solutions**:
1. Restart TypeScript server in VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
2. Restart dev server
3. Check `.nitro/types/` or `.nuxt/types/` directory exists

### Type mismatches

**Problem**: Resolver types don't match schema

**Solution**: Types are generated from schema. If schema changes, types update automatically. Make sure to:
1. Save schema files
2. Wait for type regeneration (check console)
3. Restart TypeScript server

## IDE Support

### VSCode

Install GraphQL extension for:
- Syntax highlighting
- Autocomplete
- Schema validation
- Type hints

Recommended: [GraphQL: Language Feature Support](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql)

### graphql.config.ts

Auto-generated for IDE support:

```ts
// graphql.config.ts (auto-generated)
export default {
  schema: './server/graphql/**/*.graphql',
  documents: './app/graphql/**/*.graphql',
}
```

This enables:
- Schema validation
- Query validation
- Autocomplete in `.graphql` files

## Next Steps

<div class="next-steps-grid">
<div class="next-step-card">
<h3>🔧 Context</h3>
<p>Type your custom context</p>
<a href="/guide/context">Context Guide →</a>
</div>

<div class="next-step-card">
<h3>🌐 External Services</h3>
<p>Generate types for external APIs</p>
<a href="/guide/external-services">External Services →</a>
</div>

<div class="next-step-card">
<h3>📝 Resolvers</h3>
<p>Use types in resolvers</p>
<a href="/guide/resolvers">Resolvers Guide →</a>
</div>

<div class="next-step-card">
<h3>⚙️ File Generation</h3>
<p>Customize type file paths</p>
<a href="/guide/file-generation-control">File Generation →</a>
</div>
</div>

<style scoped>
.next-steps-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin: 24px 0;
}

.next-step-card {
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  transition: all 0.3s;
}

.next-step-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(225, 0, 152, 0.1);
}

.next-step-card h3 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 16px;
}

.next-step-card p {
  margin-bottom: 12px;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.next-step-card a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
}

@media (max-width: 768px) {
  .next-steps-grid {
    grid-template-columns: 1fr;
  }
}
</style>

---

## Source

<SourceLinks fn="typeGeneration"/>

## Contributors

<Contributors fn="typeGeneration"/>

## Changelog

<Changelog fn="typeGeneration"/>
