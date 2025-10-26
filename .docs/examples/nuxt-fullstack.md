# Full-Stack Nuxt Application with GraphQL

This example demonstrates a complete full-stack Nuxt application with GraphQL integration, including server-side resolvers, client-side queries, auto-generated types, and a modern UI with Tailwind CSS.

## Features Demonstrated

- Full-stack Nuxt 3 application with GraphQL
- Server-side GraphQL schema and resolvers
- Client-side GraphQL queries and mutations
- Auto-generated TypeScript types for both server and client
- Type-safe composables using generated types
- Vue 3 components with TypeScript
- Tailwind CSS styling
- External GraphQL service integration (Countries API)
- CRUD operations (Create, Read, Update, Delete)
- Real-time UI updates

## Project Structure

```
my-nuxt-app/
├── app/
│   ├── components/
│   │   ├── UserCard.vue           # User display component
│   │   └── UserForm.vue           # User create/edit form
│   ├── composables/
│   │   └── useUsers.ts            # Type-safe user composable
│   ├── graphql/
│   │   ├── default/
│   │   │   ├── queries.graphql    # Client queries
│   │   │   └── mutations.graphql  # Client mutations
│   │   └── countries/
│   │       └── countries.graphql  # External service queries
│   ├── pages/
│   │   └── index.vue              # Main page
│   └── app.vue                    # Root component
├── server/
│   └── graphql/
│       ├── schema.graphql         # Base schema
│       ├── context.ts             # Context definition
│       ├── config.ts              # GraphQL config
│       ├── data/
│       │   └── index.ts           # Mock database
│       ├── users/
│       │   ├── user.graphql       # User schema
│       │   ├── user-queries.resolver.ts
│       │   └── create-user.resolver.ts
│       └── hello.resolver.ts
├── nuxt.config.ts                 # Nuxt configuration
├── tailwind.config.ts             # Tailwind CSS config
└── package.json
```

## Installation

```bash
# Create a new Nuxt project
npx nuxi@latest init my-nuxt-app
cd my-nuxt-app

# Install dependencies
pnpm add nitro-graphql graphql h3
pnpm add -D @nuxtjs/tailwindcss
```

## Configuration

### package.json

```json
{
  "name": "my-nuxt-app",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview"
  },
  "dependencies": {
    "@nuxtjs/tailwindcss": "^6.12.0",
    "graphql": "^16.11.0",
    "h3": "^2.0.1",
    "nitro-graphql": "^2.0.0-beta.1",
    "nuxt": "^3.15.0",
    "vue": "^3.5.0"
  }
}
```

### nuxt.config.ts

```typescript
export default defineNuxtConfig({
  compatibilityDate: '2024-07-01',
  devtools: { enabled: true },
  modules: [
    'nitro-graphql/nuxt',
    '@nuxtjs/tailwindcss',
  ],
  nitro: {
    modules: ['nitro-graphql'],
    graphql: {
      framework: 'graphql-yoga',
      // Optional: External GraphQL services
      externalServices: [
        {
          name: 'countries',
          schema: 'https://countries.trevorblades.com',
          endpoint: 'https://countries.trevorblades.com',
          downloadSchema: true,
          documents: ['app/graphql/countries/**/*.graphql'],
        },
      ],
    },
  },
})
```

## Server-Side Code

### server/graphql/schema.graphql

```graphql
scalar DateTime

type Query {
  hello: String!
  greeting(name: String!): String!
}

type Mutation {
  _empty: String
}
```

### server/graphql/users/user.graphql

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  createdAt: DateTime!
}

input CreateUserInput {
  name: String!
  email: String!
}

input UpdateUserInput {
  name: String
  email: String
}

extend type Query {
  users: [User!]!
  user(id: ID!): User
}

extend type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}
```

### server/graphql/context.ts

```typescript
declare module 'h3' {
  interface H3EventContext {
    event: H3Event
    storage: any
    user?: {
      id: string
      name: string
      email: string
      role: 'USER' | 'ADMIN'
    }
  }
}
```

### server/graphql/data/index.ts

```typescript
interface User {
  id: string
  name: string
  email: string
  createdAt: Date
}

export const users: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', createdAt: new Date('2024-01-01') },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date('2024-01-02') },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', createdAt: new Date('2024-01-03') },
]

export const generateId = () => Date.now().toString()

export function findById<T extends { id: string }>(items: T[], id: string) {
  return items.find(item => item.id === id)
}
```

### server/graphql/users/user-queries.resolver.ts

```typescript
import { users } from '../data'

export const userQueries = defineResolver({
  Query: {
    users: () => {
      return users
    },
    user: (_parent, { id }) => {
      return users.find(user => user.id === id) || null
    },
  },
})
```

### server/graphql/users/create-user.resolver.ts

```typescript
import { generateId, users } from '../data'

export const createUserMutation = defineResolver({
  Mutation: {
    createUser: (_parent, { input }) => {
      const { name, email } = input

      const newUser = {
        id: generateId(),
        name,
        email,
        createdAt: new Date(),
      }

      users.push(newUser)
      return newUser
    },
  },
})

export const updateUserMutation = defineResolver({
  Mutation: {
    updateUser: (_parent, { id, input }) => {
      const userIndex = users.findIndex(user => user.id === id)

      if (userIndex === -1) {
        throw new Error(`User with id ${id} not found`)
      }

      const updatedUser = {
        ...users[userIndex],
        ...input,
      }

      users[userIndex] = updatedUser
      return updatedUser
    },
  },
})

export const deleteUserMutation = defineResolver({
  Mutation: {
    deleteUser: (_parent, { id }) => {
      const userIndex = users.findIndex(user => user.id === id)

      if (userIndex === -1) {
        throw new Error(`User with id ${id} not found`)
      }

      users.splice(userIndex, 1)
      return true
    },
  },
})
```

## Client-Side Code

### app/graphql/default/queries.graphql

```graphql
query GetUsers {
  users {
    id
    name
    email
    createdAt
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
```

### app/graphql/default/mutations.graphql

```graphql
mutation createUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
    createdAt
  }
}

mutation updateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    name
    email
    createdAt
  }
}

mutation deleteUser($id: ID!) {
  deleteUser(id: $id)
}
```

### app/composables/useUsers.ts

```typescript
import type { CreateUserInput, GetUsersQuery, UpdateUserInput } from '#graphql/client'

export function useUsers() {
  // State
  const users = ref<GetUsersQuery['users']>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const userCount = computed(() => users.value.length)
  const hasUsers = computed(() => users.value.length > 0)

  // Actions
  const fetchUsers = async () => {
    isLoading.value = true
    error.value = null

    try {
      const { data: fetchedUsers } = await $sdk.GetUsers()
      users.value = fetchedUsers?.users || []
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch users'
      console.error('Error fetching users:', err)
    }
    finally {
      isLoading.value = false
    }
  }

  const createUser = async (input: CreateUserInput) => {
    try {
      const { data: newUser } = await $sdk.createUser({ input })
      if (newUser?.createUser) {
        users.value.unshift(newUser.createUser)
      }
      return newUser
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create user'
      throw err
    }
  }

  const updateUser = async (id: string, input: UpdateUserInput) => {
    try {
      const { data: updatedUser } = await $sdk.updateUser({ id, input })
      const index = users.value.findIndex(u => u.id === id)
      if (index !== -1 && updatedUser?.updateUser) {
        users.value[index] = updatedUser.updateUser
      }
      return updatedUser
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update user'
      throw err
    }
  }

  const deleteUser = async (id: string) => {
    try {
      await $sdk.deleteUser({ id })
      users.value = users.value.filter(u => u.id !== id)
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete user'
      throw err
    }
  }

  // Auto-fetch on mount
  onMounted(() => {
    fetchUsers()
  })

  return {
    // State
    users: readonly(users),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed
    userCount,
    hasUsers,

    // Actions
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,

    // Utilities
    refresh: fetchUsers,
  }
}
```

### app/components/UserCard.vue

```vue
<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span class="text-white font-semibold text-sm">{{ user.name.charAt(0).toUpperCase() }}</span>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">{{ user.name }}</h3>
          <p class="text-sm text-gray-600">{{ user.email }}</p>
          <p class="text-xs text-gray-500">{{ formatDate(user.createdAt) }}</p>
        </div>
      </div>

      <div class="flex space-x-2">
        <button
          @click="$emit('edit', user)"
          class="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          title="Edit user"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          @click="$emit('delete', user.id)"
          class="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
          title="Delete user"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GetUsersQuery } from '#graphql/client'

interface Props {
  user: GetUsersQuery['users'][0]
}

defineProps<Props>()
defineEmits<{
  edit: [user: GetUsersQuery['users'][0]]
  delete: [id: string]
}>()

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>
```

### app/components/UserForm.vue

```vue
<template>
  <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          v-model="form.name"
          type="text"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter full name"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          v-model="form.email"
          type="email"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter email address"
        />
      </div>

      <div class="flex space-x-3">
        <button
          type="submit"
          :disabled="isSubmitting"
          class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isSubmitting" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isEditing ? 'Updating...' : 'Creating...' }}
          </span>
          <span v-else>
            {{ isEditing ? 'Update User' : 'Create User' }}
          </span>
        </button>
        <button
          v-if="isEditing"
          type="button"
          @click="$emit('cancel')"
          class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { GetUsersQuery } from '#graphql/client'

interface Props {
  user?: GetUsersQuery['users'][0]
  isSubmitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSubmitting: false
})

const emit = defineEmits<{
  submit: [data: { name: string; email: string }]
  cancel: []
}>()

const isEditing = computed(() => !!props.user)

const form = ref({
  name: props.user?.name || '',
  email: props.user?.email || ''
})

const handleSubmit = () => {
  emit('submit', { ...form.value })
}

// Watch for user changes (for editing)
watch(
  () => props.user,
  (newUser) => {
    if (newUser) {
      form.value = {
        name: newUser.name,
        email: newUser.email
      }
    } else {
      form.value = { name: '', email: '' }
    }
  },
  { immediate: true }
)
</script>
```

### app/pages/index.vue

```vue
<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">
          Nuxt + nitro-graphql
        </h1>
        <p class="text-gray-600">
          Modern GraphQL integration with automatic type generation
        </p>
      </div>

      <!-- Main Content -->
      <div class="bg-white rounded-lg shadow">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900">User Management</h2>
            <button
              @click="refreshUsers"
              :disabled="isLoadingUsers"
              class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {{ isLoadingUsers ? 'Loading...' : 'Refresh' }}
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Users List -->
            <div>
              <h3 class="text-lg font-medium text-gray-900 mb-4">Users List</h3>
              <div v-if="isLoadingUsers" class="text-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p class="mt-2 text-gray-500">Loading users...</p>
              </div>
              <div v-else-if="users.length === 0" class="text-center py-8 text-gray-500">
                No users found
              </div>
              <div v-else class="space-y-4">
                <UserCard
                  v-for="user in users"
                  :key="user.id"
                  :user="user"
                  @edit="editUser"
                  @delete="deleteUser"
                />
              </div>
            </div>

            <!-- Create/Edit User Form -->
            <div>
              <h3 class="text-lg font-medium text-gray-900 mb-4">
                {{ editingUser ? 'Edit User' : 'Create User' }}
              </h3>
              <UserForm
                :user="editingUser"
                :is-submitting="isCreatingUser"
                @submit="handleUserSubmit"
                @cancel="cancelEdit"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GetUsersQuery } from '#graphql/client'

// Use composables
const {
  users,
  isLoading: isLoadingUsers,
  createUser,
  updateUser,
  deleteUser: removeUser,
  refresh: refreshUsers
} = useUsers()

// Form states
const isCreatingUser = ref(false)
const editingUser = ref<GetUsersQuery['users'][0] | null>(null)

// User handlers
const handleUserSubmit = async (data: { name: string; email: string }) => {
  isCreatingUser.value = true
  try {
    if (editingUser.value) {
      await updateUser(editingUser.value.id, data)
      editingUser.value = null
    } else {
      await createUser(data)
    }
  } catch (error) {
    console.error('Failed to save user:', error)
  } finally {
    isCreatingUser.value = false
  }
}

const editUser = (user: GetUsersQuery['users'][0]) => {
  editingUser.value = user
}

const cancelEdit = () => {
  editingUser.value = null
}

const deleteUser = async (id: string) => {
  if (confirm('Are you sure you want to delete this user?')) {
    try {
      await removeUser(id)
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }
}

// Set page title
useHead({
  title: 'Nuxt GraphQL - User Management',
  meta: [
    { name: 'description', content: 'User management with GraphQL and Nuxt' }
  ]
})
</script>
```

## Running the Application

```bash
# Development mode
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The application will be available at:
- Development: `http://localhost:3000`
- GraphQL endpoint: `http://localhost:3000/api/graphql`

## Type Safety

TypeScript types are auto-generated in `.nuxt/types/`:
- Server types: `nitro-graphql-server.d.ts`
- Client types: `nitro-graphql-client.d.ts`

### Using Generated Types

```typescript
// Import client types
import type {
  GetUsersQuery,
  CreateUserInput,
  UpdateUserInput
} from '#graphql/client'

// Import server types (in resolvers)
import type { QueryResolvers } from '#graphql/server'

// Use in components
const users = ref<GetUsersQuery['users']>([])
```

### Using the SDK

The auto-generated SDK (`$sdk`) provides type-safe GraphQL operations:

```typescript
// Queries
const { data } = await $sdk.GetUsers()
const { data } = await $sdk.GetUser({ id: '1' })

// Mutations
const { data } = await $sdk.createUser({ input: { name: 'John', email: 'john@example.com' } })
const { data } = await $sdk.updateUser({ id: '1', input: { name: 'Jane' } })
const { data } = await $sdk.deleteUser({ id: '1' })
```

## External Services (Countries API)

### app/graphql/countries/countries.graphql

```graphql
query GetCountries {
  countries {
    code
    name
    emoji
    continent {
      name
    }
  }
}

query GetCountry($code: ID!) {
  country(code: $code) {
    code
    name
    emoji
    phone
    capital
    currency
    native
    continent {
      name
      code
    }
    languages {
      name
      code
    }
  }
}
```

### Using External Service Types

```typescript
import type { GetCountriesQuery } from '#graphql/client/countries'

// Use countries SDK
const { data } = await $countriesSdk.GetCountries()
```

## Key Concepts

1. **Auto-Generated SDK**: The `$sdk` global is automatically available in Nuxt components and composables
2. **Type Safety**: All queries, mutations, and their variables are fully typed
3. **Composables**: Create reusable composables with generated types for clean, maintainable code
4. **Real-time Updates**: State management with Vue's reactivity system
5. **External Services**: Integrate external GraphQL APIs with auto-generated types and SDKs
6. **SSR Compatible**: Works with Nuxt's SSR, SSG, and SPA modes

## Next Steps

- Add authentication with Nuxt Auth
- Implement subscriptions for real-time updates
- Add pagination and filtering
- Integrate with a real database (Drizzle, Prisma)
- Add file uploads
- Implement caching strategies
- Add error handling UI

## Related Examples

- [Basic Nitro Server](./nitro-basic.md) - Standalone Nitro GraphQL server
- [Apollo Federation](./federation-subgraph.md) - Federated GraphQL services
- [External Services](./external-services.md) - More on integrating external APIs

## Playground Reference

This example is based on the [Nuxt Playground](https://github.com/your-repo/nitro-graphql/tree/main/playgrounds/nuxt) in the nitro-graphql repository.
