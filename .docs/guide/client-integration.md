---
title: Client Integration
category: Guide
---

# Client Integration

Learn how to use GraphQL queries and mutations in your Vue, React, or other frontend frameworks with the auto-generated SDK.

## Overview

Nitro GraphQL automatically generates a type-safe SDK for your client-side queries and mutations. This SDK provides:

- ✅ **Full type safety** - TypeScript types for all queries, mutations, and responses
- ✅ **Auto-completion** - IDE support for all GraphQL operations
- ✅ **Flexible transport** - Works with `ofetch`, `fetch`, or any HTTP client
- ✅ **Framework agnostic** - Use with React, Vue, Svelte, or any framework

## Generated Files

When you add `.graphql` files in your client directory, Nitro GraphQL generates:

```
src/graphql/                    # Vite projects
├── user.graphql               # Your query definitions
└── default/
    ├── sdk.ts                 # Generated SDK (AUTO-GENERATED)
    └── ofetch.ts              # GraphQL client wrapper

app/graphql/                   # Nuxt projects
├── user.graphql
└── default/
    ├── sdk.ts
    └── ofetch.ts
```

## Quick Start

### 1. Define Client Queries

Create `.graphql` files in your client directory:

**Vite projects:** `src/graphql/`
**Nuxt projects:** `app/graphql/`

```graphql
# src/graphql/user.graphql
query GetUsers {
  users {
    id
    name
    email
  }
}

query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    createdAt
  }
}

mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
  }
}
```

### 2. Use the Generated SDK

The SDK is automatically available via the `$sdk` export:

**Vue Example:**
```vue
<script setup lang="ts">
import { $sdk } from '~/graphql/default/ofetch'
import type { GetUsersQuery } from '#graphql/client'

const { data, pending, error, refresh } = await useAsyncData('users', () =>
  $sdk.GetUsers()
)
</script>

<template>
  <div>
    <div v-if="pending">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else-if="data">
      <div v-for="user in data.data?.users" :key="user.id">
        {{ user.name }} - {{ user.email }}
      </div>
    </div>
  </div>
</template>
```

**React Example:**
```tsx
import { useQuery } from '@tanstack/react-query'
import { $sdk } from '~/graphql/default/ofetch'
import type { GetUsersQuery } from '#graphql/client'

export function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const result = await $sdk.GetUsers()

      if (result.errors) {
        throw new Error(result.errors[0].message)
      }

      return result.data?.users
    },
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {data?.map(user => (
        <div key={user.id}>
          {user.name} - {user.email}
        </div>
      ))}
    </div>
  )
}
```

## Using Queries with Variables

Pass variables as the first argument to the SDK method:

```vue
<script setup lang="ts">
import { $sdk } from '~/graphql/default/ofetch'
import type { GetUserQuery, GetUserQueryVariables } from '#graphql/client'

const userId = ref('1')

const { data } = await useAsyncData(
  () => ['user', userId.value],
  () => $sdk.GetUser({ id: userId.value })
)
</script>
```

**TypeScript will enforce the correct variable types!**

## Using Mutations

Mutations work the same way as queries:

```vue
<script setup lang="ts">
import { $sdk } from '~/graphql/default/ofetch'
import type { CreateUserMutation, CreateUserMutationVariables } from '#graphql/client'

async function createUser() {
  const result = await $sdk.CreateUser({
    input: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  })

  if (result.errors) {
    console.error('GraphQL errors:', result.errors)
    return
  }

  console.log('Created user:', result.data?.createUser)
}
</script>
```

## Nuxt Auto-Imported Composable

In Nuxt projects, you can also use the `useGraphql()` composable which is auto-imported:

```vue
<script setup lang="ts">
import type { GetUsersQuery } from '#graphql/client'

// useGraphql() is auto-imported in Nuxt
const { GetUsers } = useGraphql()

const { data } = await useAsyncData('users', () => GetUsers())
</script>
```

This is equivalent to using `$sdk.GetUsers()` but provides a more Nuxt-friendly API.

## Custom Client Configuration

You can customize the GraphQL client by modifying the generated `ofetch.ts` file:

```typescript
// src/graphql/default/ofetch.ts
import type { Requester } from './sdk'
import { getSdk } from './sdk'
import { $fetch } from 'ofetch'

export function createGraphQLClient(endpoint: string): Requester {
  return async <R>(doc: string, vars?: any): Promise<R> => {
    const result = await $fetch(endpoint, {
      method: 'POST',
      body: { query: doc, variables: vars },
      headers: {
        'Content-Type': 'application/json',
        // Add custom headers here
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      // Add custom options
      retry: 3,
      timeout: 10000,
    })

    return result as R
  }
}

export const $sdk = getSdk(createGraphQLClient('/api/graphql'))
```

## Error Handling

### System Errors vs GraphQL Errors

```typescript
const result = await $sdk.GetUser({ id: '1' })

// System errors (network, server crash)
if (result.errors) {
  console.error('System error:', result.errors[0].message)
  return
}

// Success - data is available
console.log('User:', result.data?.user)
```

### Using Union Types for Domain Errors

For better error handling, use GraphQL union types:

**Schema:**
```graphql
type User {
  id: ID!
  name: String!
  email: String!
}

type UserNotFoundError {
  message: String!
  userId: ID!
}

union UserResult = User | UserNotFoundError

type Query {
  getUser(id: ID!): UserResult!
}
```

**Client:**
```typescript
const result = await $sdk.GetUser({ id: '1' })

if (result.errors) {
  throw new Error(result.errors[0].message)
}

const userResult = result.data?.getUser

// Type-safe discrimination
if (userResult?.__typename === 'User') {
  console.log('User:', userResult.name)
} else if (userResult?.__typename === 'UserNotFoundError') {
  console.log('Not found:', userResult.message)
}
```

## React Query Integration

Create custom hooks for better reusability:

```typescript
// src/hooks/useUser.ts
import { useQuery, useMutation } from '@tanstack/react-query'
import { $sdk } from '~/graphql/default/ofetch'

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const result = await $sdk.GetUser({ id: userId })

      if (result.errors) {
        throw new Error(result.errors[0].message)
      }

      return result.data?.getUser
    },
  })
}

export function useCreateUser() {
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const result = await $sdk.CreateUser({ input })

      if (result.errors) {
        throw new Error(result.errors[0].message)
      }

      return result.data?.createUser
    },
  })
}
```

**Usage:**
```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading } = useUser(userId)
  const createUser = useCreateUser()

  if (isLoading) return <div>Loading...</div>

  return <div>{user?.name}</div>
}
```

## Vue Composables

Similar pattern for Vue:

```typescript
// src/composables/useUser.ts
import { $sdk } from '~/graphql/default/ofetch'

export function useUser(userId: Ref<string>) {
  const { data, pending, error, refresh } = useAsyncData(
    () => ['user', userId.value],
    () => $sdk.GetUser({ id: userId.value }),
    { watch: [userId] }
  )

  const user = computed(() => data.value?.data?.getUser)

  return {
    user,
    pending,
    error,
    refresh,
  }
}
```

## Type Helpers

Create utilities for type-safe union type handling:

```typescript
// src/utils/graphql-helpers.ts

export function isType<T extends { __typename?: string }>(
  result: T,
  typename: string
): result is T & { __typename: typeof typename } {
  return result.__typename === typename
}

export function isError<T extends { __typename?: string }>(
  result: T
): result is T & { message: string } {
  return 'message' in result && typeof result.message === 'string'
}
```

**Usage:**
```typescript
const userResult = result.data?.getUser

if (isType(userResult, 'User')) {
  // TypeScript knows this is a User
  console.log(userResult.name)
} else if (isType(userResult, 'UserNotFoundError')) {
  // TypeScript knows this is UserNotFoundError
  console.log(userResult.userId)
}
```

## Best Practices

1. **Use TypeScript types** - Always import types from `#graphql/client`
2. **Handle errors** - Check for `result.errors` before accessing data
3. **Create reusable hooks** - Wrap SDK calls in React hooks or Vue composables
4. **Use union types** - Prefer GraphQL unions over throwing errors for domain errors
5. **Customize the client** - Modify `ofetch.ts` to add authentication, retries, etc.
6. **Keep queries focused** - Create separate query files for different features
7. **Use fragments** - Reuse common field selections across queries

## Configuration

### Vite Project Structure

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { nitro } from 'nitro/vite'
import { graphql } from 'nitro-graphql/vite'

export default defineConfig({
  plugins: [
    graphql(),
    nitro(),
  ],
  nitro: {
    modules: [
      graphql({
        framework: 'graphql-yoga',
        paths: {
          serverGraphql: 'server/graphql',
          clientGraphql: 'src/graphql',  // Client queries location
        },
      }),
    ],
  },
})
```

### Nuxt Project

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nitro-graphql/nuxt'],
  nitro: {
    graphql: {
      framework: 'graphql-yoga',
      // Client queries in app/graphql/ by default
    },
  },
})
```

## Next Steps

- [Type Generation](/guide/type-generation) - Learn about all generated types
- [External Services](/guide/external-services) - Connect to external GraphQL APIs
- [Error Handling](/guide/error-handling) - Advanced error handling patterns
- [Performance](/guide/performance) - Optimize your GraphQL queries
