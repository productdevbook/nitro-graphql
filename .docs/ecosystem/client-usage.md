---
category: Ecosystem
---

# Client Usage

<FunctionInfo fn="clientUsage"/>

Learn how to use GraphQL on the frontend with auto-generated types, composables, and best practices for Nuxt applications.

## Overview

Nitro GraphQL generates a fully typed SDK for your client-side GraphQL operations. You can use this SDK in Vue components, composables, and anywhere in your Nuxt app with full TypeScript support.

## Auto-Generated Files

When you create `.graphql` files in your client directory, Nitro GraphQL automatically generates:

```
app/graphql/
├── users/
│   ├── queries.graphql           # Your queries
│   └── mutations.graphql         # Your mutations
├── index.ts                      # Auto-generated barrel export
└── default/
    ├── sdk.ts                    # Auto-generated type-safe SDK
    └── ofetch.ts                 # Auto-generated Nuxt HTTP client
```

Types are generated in:
```
.nuxt/types/
└── nitro-graphql-client.d.ts     # Client types available via #graphql/client
```

## Basic Usage

### Creating Queries

Define your GraphQL queries in `.graphql` files:

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
# app/graphql/users/get-user.graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    createdAt
  }
}
```

### Creating Mutations

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

```graphql
# app/graphql/users/update-user.graphql
mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    name
    email
  }
}
```

### Using in Components

```vue
<script setup lang="ts">
// Import the auto-generated SDK via composable
const { GetUsers, GetUser, CreateUser } = useGraphql()

// Fetch all users
const { data: users, refresh } = await useAsyncData('users', () =>
  GetUsers()
)

// Fetch single user
const { data: user } = await useAsyncData('user', () =>
  GetUser({ id: '1' })
)

// Create a new user
async function createUser() {
  const result = await CreateUser({
    input: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  })

  console.log('Created:', result.createUser)
  await refresh() // Refresh the user list
}
</script>

<template>
  <div>
    <button @click="createUser">Create User</button>

    <ul v-if="users?.users">
      <li v-for="user in users.users" :key="user.id">
        {{ user.name }}
      </li>
    </ul>
  </div>
</template>
```

## Type Safety

All operations are fully typed:

```vue
<script setup lang="ts">
import type { GetUsersQuery, CreateUserMutation } from '#graphql/client'

const { GetUsers, CreateUser } = useGraphql()

// TypeScript knows the exact shape of the response
const { data } = await useAsyncData('users', () => GetUsers())

// data is typed as: GetUsersQuery | null
if (data.value?.users) {
  // users is typed as: Array<{ id: string, name: string, email: string }>
  data.value.users.forEach(user => {
    console.log(user.name) // ✅ TypeScript knows this exists
    console.log(user.age)  // ❌ TypeScript error: Property 'age' does not exist
  })
}
</script>
```

## Composable Patterns

### Reusable GraphQL Composables

Create composables to encapsulate GraphQL logic:

```ts
// app/composables/useUsers.ts
export function useUsers() {
  const { GetUsers, CreateUser, UpdateUser, DeleteUser } = useGraphql()

  // Fetch users with caching
  const { data: users, refresh, pending, error } = useAsyncData(
    'users',
    () => GetUsers(),
    {
      // Cache for 5 minutes
      getCachedData: key => useNuxtApp().payload.data[key] || useNuxtApp().static.data[key]
    }
  )

  // Computed for easy access
  const userList = computed(() => users.value?.users ?? [])

  // Create user with automatic refresh
  async function create(name: string, email: string) {
    try {
      const result = await CreateUser({
        input: { name, email }
      })
      await refresh()
      return result.createUser
    }
    catch (err) {
      console.error('Failed to create user:', err)
      throw err
    }
  }

  // Update user with optimistic update
  async function update(id: string, name: string, email: string) {
    try {
      const result = await UpdateUser({
        id,
        input: { name, email }
      })
      await refresh()
      return result.updateUser
    }
    catch (err) {
      console.error('Failed to update user:', err)
      throw err
    }
  }

  // Delete user
  async function remove(id: string) {
    try {
      await DeleteUser({ id })
      await refresh()
    }
    catch (err) {
      console.error('Failed to delete user:', err)
      throw err
    }
  }

  return {
    users: userList,
    pending,
    error,
    refresh,
    create,
    update,
    remove,
  }
}
```

Use in components:

```vue
<script setup lang="ts">
const { users, pending, create, update, remove } = useUsers()

async function handleCreate() {
  await create('Alice', 'alice@example.com')
}
</script>

<template>
  <div>
    <div v-if="pending">Loading...</div>
    <div v-else>
      <button @click="handleCreate">Add User</button>
      <ul>
        <li v-for="user in users" :key="user.id">
          {{ user.name }}
        </li>
      </ul>
    </div>
  </div>
</template>
```

### Pagination Composable

```ts
// app/composables/usePaginatedUsers.ts
export function usePaginatedUsers(pageSize: number = 10) {
  const { GetUsersPaginated } = useGraphql()

  const currentPage = ref(1)

  const { data, refresh, pending } = useAsyncData(
    () => `users-page-${currentPage.value}`,
    () => GetUsersPaginated({
      page: currentPage.value,
      limit: pageSize
    }),
    {
      watch: [currentPage]
    }
  )

  const users = computed(() => data.value?.usersPaginated.users ?? [])
  const totalPages = computed(() => data.value?.usersPaginated.totalPages ?? 1)
  const hasNext = computed(() => currentPage.value < totalPages.value)
  const hasPrev = computed(() => currentPage.value > 1)

  function nextPage() {
    if (hasNext.value) {
      currentPage.value++
    }
  }

  function prevPage() {
    if (hasPrev.value) {
      currentPage.value--
    }
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  return {
    users,
    currentPage,
    totalPages,
    hasNext,
    hasPrev,
    pending,
    nextPage,
    prevPage,
    goToPage,
    refresh,
  }
}
```

## SSR Considerations

### Server-Side Rendering

Queries in `useAsyncData` automatically execute on the server:

```vue
<script setup lang="ts">
const { GetUsers } = useGraphql()

// Runs on server during SSR, then hydrates on client
const { data } = await useAsyncData('users', () => GetUsers())
</script>
```

### Client-Only Queries

For client-only operations:

```vue
<script setup lang="ts">
const { GetUsers } = useGraphql()

// Skip SSR execution
const { data } = await useAsyncData(
  'users',
  () => GetUsers(),
  {
    server: false, // Don't execute on server
  }
)
</script>
```

### Lazy Loading

Load data after component mount:

```vue
<script setup lang="ts">
const { GetUsers } = useGraphql()

// Use useLazyAsyncData for deferred loading
const { data, pending } = useLazyAsyncData('users', () => GetUsers())
</script>

<template>
  <div>
    <div v-if="pending">Loading...</div>
    <div v-else>{{ data?.users.length }} users</div>
  </div>
</template>
```

## Error Handling

### Component-Level Error Handling

```vue
<script setup lang="ts">
const { CreateUser } = useGraphql()

const error = ref<string | null>(null)

async function handleCreate() {
  error.value = null

  try {
    await CreateUser({
      input: {
        name: 'John',
        email: 'john@example.com'
      }
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred'
  }
}
</script>

<template>
  <div>
    <div v-if="error" class="error">{{ error }}</div>
    <button @click="handleCreate">Create User</button>
  </div>
</template>
```

### Global Error Handler

```ts
// app/plugins/graphql-error-handler.ts
export default defineNuxtPlugin(() => {
  const toast = useToast() // Your notification system

  // Intercept GraphQL errors globally
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args)

      if (args[0]?.toString().includes('/api/graphql')) {
        const clone = response.clone()
        const data = await clone.json()

        if (data.errors) {
          for (const error of data.errors) {
            toast.error(error.message)
          }
        }
      }

      return response
    }
    catch (err) {
      if (err instanceof Error) {
        toast.error(err.message)
      }
      throw err
    }
  }
})
```

## Advanced Patterns

### Optimistic Updates

Update UI immediately before server confirms:

```ts
// app/composables/useOptimisticUsers.ts
export function useOptimisticUsers() {
  const { GetUsers, CreateUser } = useGraphql()

  const { data, refresh } = await useAsyncData('users', () => GetUsers())
  const users = computed(() => data.value?.users ?? [])

  async function create(name: string, email: string) {
    // Optimistic ID
    const tempId = `temp-${Date.now()}`

    // Optimistically add to list
    const newUser = { id: tempId, name, email }
    if (data.value?.users) {
      data.value.users.push(newUser)
    }

    try {
      // Send to server
      const result = await CreateUser({ input: { name, email } })

      // Replace temp user with real user
      if (data.value?.users) {
        const index = data.value.users.findIndex(u => u.id === tempId)
        if (index !== -1) {
          data.value.users[index] = result.createUser
        }
      }
    }
    catch (err) {
      // Rollback on error
      if (data.value?.users) {
        data.value.users = data.value.users.filter(u => u.id !== tempId)
      }
      throw err
    }
  }

  return { users, create }
}
```

### Infinite Scroll

```ts
// app/composables/useInfiniteUsers.ts
export function useInfiniteUsers(pageSize: number = 20) {
  const { GetUsersPaginated } = useGraphql()

  const users = ref<Array<any>>([])
  const currentPage = ref(1)
  const hasMore = ref(true)
  const loading = ref(false)

  async function loadMore() {
    if (loading.value || !hasMore.value)
      return

    loading.value = true

    try {
      const result = await GetUsersPaginated({
        page: currentPage.value,
        limit: pageSize
      })

      if (result.usersPaginated.users.length > 0) {
        users.value.push(...result.usersPaginated.users)
        currentPage.value++
      }
      else {
        hasMore.value = false
      }
    }
    catch (err) {
      console.error('Failed to load more:', err)
    }
    finally {
      loading.value = false
    }
  }

  // Load initial data
  onMounted(() => loadMore())

  return {
    users,
    hasMore,
    loading,
    loadMore,
  }
}
```

Use with intersection observer:

```vue
<script setup lang="ts">
const { users, hasMore, loading, loadMore } = useInfiniteUsers()

const sentinel = ref<HTMLElement>()

onMounted(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      loadMore()
    }
  })

  if (sentinel.value) {
    observer.observe(sentinel.value)
  }

  onUnmounted(() => observer.disconnect())
})
</script>

<template>
  <div>
    <div v-for="user in users" :key="user.id">
      {{ user.name }}
    </div>

    <div ref="sentinel" v-if="hasMore">
      <div v-if="loading">Loading more...</div>
    </div>
  </div>
</template>
```

### Real-Time Updates with Polling

```ts
// app/composables/useRealtimeUsers.ts
export function useRealtimeUsers(interval: number = 5000) {
  const { GetUsers } = useGraphql()

  const { data, refresh } = await useAsyncData('users', () => GetUsers())
  const users = computed(() => data.value?.users ?? [])

  // Poll for updates
  const { pause, resume } = useIntervalFn(refresh, interval)

  // Pause when tab is hidden
  usePageLeave(() => pause())
  onMounted(() => resume())

  return { users, refresh, pause, resume }
}
```

## Working with Fragments

Define reusable fragments:

```graphql
# app/graphql/fragments/user-fields.graphql
fragment UserFields on User {
  id
  name
  email
  createdAt
}
```

Use in queries:

```graphql
# app/graphql/users/get-users.graphql
#import './fragments/user-fields.graphql'

query GetUsers {
  users {
    ...UserFields
  }
}
```

## External Services

For external GraphQL APIs, use the service-specific SDK:

```vue
<script setup lang="ts">
// Access external service (e.g., GitHub)
const { github } = useGraphql()

const { data } = await useAsyncData('repo', () =>
  github.GetRepository({ owner: 'unjs', name: 'nitro' })
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

Type imports for external services:

```ts
import type { GetRepositoryQuery } from '#graphql/client/github'
```

## Caching Strategies

### nuxt/app Caching

Use Nuxt's built-in caching:

```ts
const { data } = await useAsyncData(
  'users',
  () => GetUsers(),
  {
    // Cache in payload
    getCachedData: (key) => {
      return useNuxtApp().payload.data[key] || useNuxtApp().static.data[key]
    }
  }
)
```

### Custom Cache

Implement your own cache:

```ts
// app/composables/useCachedGraphQL.ts
const cache = new Map<string, { data: any, timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useCachedGraphQL<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL
) {
  async function fetch() {
    const cached = cache.get(key)
    const now = Date.now()

    if (cached && now - cached.timestamp < ttl) {
      return cached.data as T
    }

    const data = await fetcher()
    cache.set(key, { data, timestamp: now })
    return data
  }

  return useAsyncData(key, fetch)
}
```

Use it:

```ts
const { GetUsers } = useGraphql()

const { data } = await useCachedGraphQL(
  'users',
  () => GetUsers(),
  5 * 60 * 1000 // 5 minute cache
)
```

## Testing

### Component Testing

```ts
import { mount } from '@vue/test-utils'
// components/UserList.spec.ts
import { describe, expect, it, vi } from 'vitest'
import UserList from './UserList.vue'

// Mock useGraphql
vi.mock('#imports', () => ({
  useGraphql: () => ({
    GetUsers: vi.fn().mockResolvedValue({
      users: [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
      ]
    })
  }),
  useAsyncData: vi.fn((key, fetcher) => {
    return {
      data: ref(fetcher()),
      pending: ref(false),
      error: ref(null),
      refresh: vi.fn(),
    }
  }),
}))

describe('UserList', () => {
  it('renders users', async () => {
    const wrapper = mount(UserList)
    await nextTick()

    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')
  })
})
```

## Best Practices

### 1. Organize Queries by Feature

```
app/graphql/
├── users/
│   ├── queries.graphql
│   └── mutations.graphql
├── posts/
│   ├── queries.graphql
│   └── mutations.graphql
└── comments/
    ├── queries.graphql
    └── mutations.graphql
```

### 2. Use Composables for Logic

Keep components clean by moving GraphQL logic to composables:

```ts
// ✅ Good: Logic in composable
const { users, create } = useUsers()

// ❌ Bad: Logic in component
const { GetUsers, CreateUser } = useGraphql()
```

### 3. Handle Loading States

Always show loading states:

```vue
<template>
  <div v-if="pending">Loading...</div>
  <div v-else-if="error">Error: {{ error }}</div>
  <div v-else>{{ data }}</div>
</template>
```

### 4. Type Your Composables

```ts
import type { GetUsersQuery } from '#graphql/client'

export function useUsers() {
  // ...
  const users = computed<GetUsersQuery['users']>(() => data.value?.users ?? [])
  return { users }
}
```

### 5. Avoid Over-Fetching

Only request fields you need:

```graphql
# ❌ Over-fetching
query GetUsers {
  users {
    id
    name
    email
    bio
    avatar
    createdAt
    updatedAt
    # ... many more fields
  }
}

# ✅ Request only what you need
query GetUsers {
  users {
    id
    name
  }
}
```

## Next Steps

- [Nuxt Integration](/ecosystem/nuxt-integration) - Nuxt-specific features
- [Type Generation](/guide/type-generation) - Understanding generated types
- [External Services](/guide/external-services) - Third-party GraphQL APIs
- [Error Handling](/guide/error-handling) - Error handling strategies

---

## Source
<SourceLinks fn="clientUsage"/>

## Contributors
<Contributors fn="clientUsage"/>

## Changelog
<Changelog fn="clientUsage"/>
