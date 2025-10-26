# Quick Start: Nuxt

Set up a full-stack GraphQL application in your Nuxt project with type-safe client queries in 5 minutes.

## Prerequisites

- Node.js 18 or higher
- pnpm, npm, or yarn
- Basic knowledge of Nuxt 3, TypeScript, and GraphQL

## Step 1: Install Dependencies

::: code-group

```bash [pnpm]
pnpm add nitro-graphql graphql-yoga graphql
```

```bash [npm]
npm install nitro-graphql graphql-yoga graphql
```

```bash [yarn]
yarn add nitro-graphql graphql-yoga graphql
```

:::

## Step 2: Configure Nuxt

Add `nitro-graphql/nuxt` to your Nuxt modules:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nitro-graphql/nuxt'],
  nitro: {
    graphql: {
      framework: 'graphql-yoga',
    },
  },
})
```

::: warning Module Path
For Nuxt, use `nitro-graphql/nuxt` (not just `nitro-graphql`). This ensures proper integration with Nuxt's module system.
:::

## Step 3: Create Server Schema

Create your GraphQL schema in the server directory:

```graphql
# server/graphql/schema.graphql
type User {
  id: ID!
  name: String!
  email: String!
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

## Step 4: Add Server Resolvers

Create resolver files to implement your API:

```ts
// server/graphql/users.resolver.ts
export const userQueries = defineQuery({
  users: async (_, __, context) => {
    // Access H3 event context
    const users = await context.storage?.getItem('users') || []
    return users
  },
  user: async (_, { id }, context) => {
    const users = await context.storage?.getItem('users') || []
    return users.find(u => u.id === id) || null
  }
})

export const userMutations = defineMutation({
  createUser: async (_, { input }, context) => {
    const users = await context.storage?.getItem('users') || []
    const user = {
      id: Date.now().toString(),
      ...input,
    }
    users.push(user)
    await context.storage?.setItem('users', users)
    return user
  }
})
```

::: tip Multiple Resolvers
You can split Query and Mutation resolvers into separate files using `defineQuery()` and `defineMutation()`. They'll be automatically merged.
:::

## Step 5: Create Client Queries

Create GraphQL query files for your frontend:

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

::: info Client vs Server
- **Server GraphQL**: `server/graphql/**/*.graphql` (schema definitions)
- **Client GraphQL**: `app/graphql/**/*.graphql` (queries & mutations for your frontend)
:::

## Step 6: Use in Vue Components

Now use the auto-generated SDK in your Vue components:

```vue
<script setup lang="ts">
import { useAsyncData } from 'nuxt/app'

// Import the auto-generated SDK
const { GetUsers, CreateUser } = useGraphql()

// Fetch users on component mount
const { data: users, refresh } = await useAsyncData('users', () =>
  GetUsers()
)

// Create a new user
async function addUser() {
  await CreateUser({
    input: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  })
  // Refresh the list
  await refresh()
}
</script>

<template>
  <div>
    <h1>Users</h1>

    <button @click="addUser">Add User</button>

    <ul v-if="users?.users">
      <li v-for="user in users.users" :key="user.id">
        {{ user.name }} - {{ user.email }}
      </li>
    </ul>
  </div>
</template>
```

::: tip Type Safety
The SDK is fully typed! Your IDE will autocomplete query names, arguments, and response fields.
:::

## Step 7: Start Development Server

```bash
pnpm dev
```

Your full-stack GraphQL application is ready!

## Verify Everything Works

### 1. Check GraphQL Playground

Open [http://localhost:3000/api/graphql](http://localhost:3000/api/graphql)

Test your mutation:
```graphql
mutation {
  createUser(input: {
    name: "Alice"
    email: "alice@example.com"
  }) {
    id
    name
    email
  }
}
```

### 2. Check Your App

Navigate to your app route and verify users are displayed.

### 3. Check Generated Types

Generated types should appear in:
- `.nuxt/types/nitro-graphql-server.d.ts` - Server types
- `.nuxt/types/nitro-graphql-client.d.ts` - Client types
- `app/graphql/default/sdk.ts` - Client SDK

## File Structure

Your Nuxt project should now have:

```
your-nuxt-app/
├── server/
│   └── graphql/
│       ├── schema.graphql          # Schema definitions
│       ├── users.resolver.ts       # Server resolvers
│       ├── context.ts              # Auto-generated context types
│       ├── config.ts               # Auto-generated GraphQL config
│       └── schema.ts               # Auto-generated schema export
├── app/
│   └── graphql/
│       ├── users/
│       │   ├── get-users.graphql   # Client query
│       │   └── create-user.graphql # Client mutation
│       ├── index.ts                # Auto-generated exports
│       └── default/
│           ├── sdk.ts              # Auto-generated SDK
│           └── ofetch.ts           # Auto-generated HTTP client
├── .nuxt/
│   └── types/
│       ├── nitro-graphql-server.d.ts  # Server types
│       └── nitro-graphql-client.d.ts  # Client types
├── graphql.config.ts               # Auto-generated GraphQL IDE config
├── nuxt.config.ts
└── package.json
```

## Advanced: Using Composables

Create a reusable composable for your GraphQL queries:

```ts
// app/composables/useUsers.ts
export function useUsers() {
  const { GetUsers, CreateUser, UpdateUser, DeleteUser } = useGraphql()

  const { data: users, refresh, pending } = useAsyncData('users', () =>
    GetUsers())

  async function create(name: string, email: string) {
    await CreateUser({
      input: { name, email }
    })
    await refresh()
  }

  return {
    users: computed(() => users.value?.users ?? []),
    pending,
    refresh,
    create,
  }
}
```

Use in components:

```vue
<script setup lang="ts">
const { users, pending, create } = useUsers()

async function handleSubmit() {
  await create('John Doe', 'john@example.com')
}
</script>

<template>
  <div>
    <div v-if="pending">Loading...</div>
    <ul v-else>
      <li v-for="user in users" :key="user.id">
        {{ user.name }}
      </li>
    </ul>
  </div>
</template>
```

## Nuxt Layers Support

Nitro GraphQL supports Nuxt layers! Extend from another layer and all its GraphQL schemas and resolvers will be automatically discovered:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['./layers/base-layer'],
  modules: ['nitro-graphql/nuxt'],
  nitro: {
    graphql: {
      framework: 'graphql-yoga',
    },
  },
})
```

```
your-nuxt-app/
├── layers/
│   └── base-layer/
│       └── server/
│           └── graphql/
│               ├── schema.graphql      # ← Discovered
│               └── posts.resolver.ts   # ← Discovered
└── server/
    └── graphql/
        ├── schema.graphql              # ← Discovered
        └── users.resolver.ts           # ← Discovered
```

All schemas and resolvers from layers are automatically merged with your app's schemas.

## Next Steps

<div class="next-steps-grid">
<div class="next-step-card">
<h3>📝 Your First Query</h3>
<p>Deep dive into queries and mutations</p>
<a href="/guide/your-first-query">Learn More →</a>
</div>

<div class="next-step-card">
<h3>🎯 Type Generation</h3>
<p>Understand server and client types</p>
<a href="/guide/type-generation">Type Generation →</a>
</div>

<div class="next-step-card">
<h3>🌐 External Services</h3>
<p>Connect to external GraphQL APIs</p>
<a href="/guide/external-services">External Services →</a>
</div>

<div class="next-step-card">
<h3>🔧 Context & Middleware</h3>
<p>Add authentication and custom context</p>
<a href="/guide/context">Working with Context →</a>
</div>
</div>

## Common Issues

### Module not found: nitro-graphql

**Solution**: Make sure you installed the package with `pnpm add nitro-graphql graphql-yoga graphql`

### GraphQL endpoint returns 404

**Solution**: Verify you're using `nitro-graphql/nuxt` in your modules (not just `nitro-graphql`)

### useGraphql is not defined

**Solution**:
1. Make sure you have client queries in `app/graphql/**/*.graphql`
2. Restart the dev server
3. Check that `app/graphql/index.ts` was auto-generated

### Types not updating

**Solution**:
1. Restart dev server (types generate on startup)
2. Check `.nuxt/types/` directory for generated files
3. Ensure your GraphQL files follow naming conventions

## Learn More

- [Your First Query](/guide/your-first-query)
- [Type Generation](/guide/type-generation)
- [Context & H3 Event](/guide/context)
- [External GraphQL Services](/guide/external-services)

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
