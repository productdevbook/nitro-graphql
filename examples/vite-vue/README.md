# Nitro GraphQL + Vue 3 + Vite Example

Full-stack **Vue 3** application with **Vite**, **Nitro**, and **GraphQL**. Demonstrates modern Vue patterns, type-safe GraphQL, and production-ready Docker deployment.

## Get Started

Clone this example using [giget](https://github.com/unjs/giget):

```bash
npx giget@latest gh:productdevbook/nitro-graphql/examples/vite-vue my-vue-app
cd my-vue-app
pnpm install
```

Or using pnpm:

```bash
pnpm dlx giget@latest gh:productdevbook/nitro-graphql/examples/vite-vue my-vue-app
```

## Features

- 🖖 **Vue 3** - Progressive JavaScript Framework
- ⚡️ **Vite** - Lightning fast frontend tooling
- 🚀 **Nitro** - Universal server framework
- 🔺 **GraphQL** - Type-safe API with union types
- 🍍 **Pinia** - Intuitive Vue store
- 🥤 **Pinia Colada** - Smart GraphQL query library
- 🎨 **Tailwind CSS 4** - Utility-first styling
- 🛣️ **Vue Router** - Official router for Vue.js
- 🐳 **Docker Ready** - Multi-runtime support (Node.js & Bun)
- 📦 **Auto-Generated Types** - Full type safety end-to-end

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3.5.24 + TypeScript |
| State | Pinia 3.0.4 + Pinia Colada 0.17.8 |
| Routing | Vue Router 4.6.3 |
| Styling | Tailwind CSS 4.1.17 |
| Backend | Nitro 3 + H3 v2 |
| GraphQL | GraphQL Yoga 5.16.2 |
| Runtime | Node.js 24+ or Bun 1.3+ |

## Development Setup

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Access the app at: http://localhost:5173

GraphQL Playground: http://localhost:5173/api/graphql

## Build & Deploy

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview

# Type check
pnpm lint:type
```

## Docker Deployment

### Node.js Runtime (Port 3000)

```bash
# Build and run
docker compose up app --build

# Run in background
docker compose up app --build -d

# View logs
docker compose logs -f app
```

### Bun Runtime (Port 3001)

```bash
# Build and run
docker compose --profile bun up --build

# Run in background
docker compose --profile bun up --build -d
```

### Both Runtimes Simultaneously

```bash
# Run both Node.js (3000) and Bun (3001)
docker compose --profile bun up app bun --build
```

### Development Mode (Port 5173)

```bash
# Run with hot-reload
docker compose --profile dev up
```

### Docker Commands

```bash
# Stop all services
docker compose down

# View running containers
docker compose ps

# Execute command in container
docker compose exec app sh

# Rebuild without cache
docker compose build --no-cache app
```

## Project Structure

```
examples/vite-vue/
├── server/
│   ├── api/
│   │   └── hello.ts            # REST API example
│   └── graphql/
│       ├── user/
│       │   ├── user.graphql    # User schema with unions
│       │   ├── getUser.resolver.ts
│       │   ├── createUser.resolver.ts
│       │   └── userStore.ts    # In-memory store
│       ├── config.ts            # GraphQL config
│       ├── context.d.ts         # H3 context types
│       └── schema.ts            # Schema definition
├── src/
│   ├── components/              # Vue components
│   │   ├── ErrorBoundary.vue
│   │   └── UserCard.vue
│   ├── composables/             # Composables
│   │   ├── useUser.ts
│   │   └── useGraphQL.ts
│   ├── graphql/                 # GraphQL client
│   │   └── default/
│   │       └── sdk.ts           # Auto-generated SDK
│   ├── pages/                   # Page components
│   │   ├── HomePage.vue
│   │   └── UserPage.vue
│   ├── router/                  # Vue Router config
│   │   └── index.ts
│   ├── utils/                   # Utilities
│   ├── App.vue                  # Root component
│   └── main.ts                  # Entry point
├── Dockerfile                   # Node.js build
├── Dockerfile.bun               # Bun build
├── docker-compose.yml           # Multi-service setup
└── vite.config.ts              # Vite + Nitro config
```

## GraphQL Operations

### Get User

```graphql
query GetUser($id: ID!) {
  getUser(id: $id) {
    __typename
    ... on User {
      id
      name
      email
      createdAt
    }
    ... on UserNotFoundError {
      message
      userId
    }
    ... on UnauthorizedError {
      message
      requiredPermission
    }
  }
}
```

**Variables:**
```json
{
  "id": "1"
}
```

### Create User

```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

## Key Concepts

### Union Types for Error Handling

This example demonstrates GraphQL union types for type-safe error handling:

**GraphQL Schema:**
```graphql
type User {
  id: ID!
  name: String!
  email: String!
  createdAt: String!
}

type UserNotFoundError {
  message: String!
  userId: ID!
}

type UnauthorizedError {
  message: String!
  requiredPermission: String
}

union UserResult = User | UserNotFoundError | UnauthorizedError

type Query {
  getUser(id: ID!): UserResult!
}
```

**Vue Component:**
```vue
<script setup lang="ts">
import { useGetUserQuery } from '#graphql/client'

const { data } = useGetUserQuery({ id: userId })
</script>

<template>
  <div v-if="data?.__typename === 'User'">
    <!-- TypeScript knows data has User fields -->
    <h1>{{ data.name }}</h1>
  </div>

  <div v-else-if="data?.__typename === 'UserNotFoundError'">
    <!-- TypeScript knows data has error fields -->
    <p>Error: {{ data.message }}</p>
  </div>
</template>
```

### Pinia Colada Integration

The example uses Pinia Colada for smart GraphQL query management:

**Features:**
- 🔄 Automatic caching and deduplication
- 🎯 Smart refetching strategies
- ⚡️ Optimistic updates
- 📡 Real-time updates
- 🧩 Composable-first API

**Usage:**
```typescript
// src/composables/useUser.ts
import { useQuery } from '@pinia/colada'
import { getSdk } from '#graphql/client/default/sdk'

export function useUser(id: string) {
  return useQuery({
    key: ['user', id],
    query: () => getSdk().GetUser({ id }),
  })
}
```

**In Components:**
```vue
<script setup lang="ts">
import { useUser } from '@/composables/useUser'

const userId = '1'
const { data, isLoading, error, refetch } = useUser(userId)
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else-if="data?.__typename === 'User'">
    <h1>{{ data.name }}</h1>
    <button @click="refetch">Refresh</button>
  </div>
</template>
```

### Auto-Generated SDK

nitro-graphql automatically generates a type-safe SDK:

```typescript
// Auto-generated at src/graphql/default/sdk.ts
import { getSdk } from '#graphql/client/default/sdk'

const sdk = getSdk()
const result = await sdk.GetUser({ id: '1' })
```

### Vite + Nitro Configuration

```typescript
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import graphql from 'nitro-graphql'
import nitro from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    graphql({
      framework: 'graphql-yoga',
    }),
    nitro(),
  ],
})
```

**Important**: The `graphql()` plugin must be placed **before** `nitro()`.

### Vue Composables Pattern

The example demonstrates Vue 3 composables for reusable logic:

```typescript
// src/composables/useUser.ts
import { useQuery } from '@pinia/colada'
import { getSdk } from '#graphql/client/default/sdk'

export function useUser(id: Ref<string> | string) {
  const userId = isRef(id) ? id : ref(id)

  return useQuery({
    key: () => ['user', userId.value],
    query: () => getSdk().GetUser({ id: userId.value }),
  })
}
```

### Component-Based Routing

Vue Router with lazy-loaded components:

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../pages/HomePage.vue'),
    },
    {
      path: '/user/:id',
      name: 'user',
      component: () => import('../pages/UserPage.vue'),
    },
  ],
})
```

## Performance Optimizations

- **Code Splitting**: Lazy-loaded routes
- **Optimized Builds**: Multi-stage Docker builds
  - Node.js build: ~61 KB
  - Bun build: ~48 KB (22% smaller)
- **Query Caching**: Pinia Colada smart caching
- **Static Assets**: Efficient caching headers
- **Tree Shaking**: Rolldown optimization
- **Component Lazy Loading**: On-demand component loading

## Docker Build Comparison

| Runtime | Package Manager | Output Size | Multi-stage |
|---------|----------------|-------------|-------------|
| Node.js 24 | pnpm | ~61 KB | ✅ |
| Bun 1 | bun | ~48 KB | ✅ |

## API Endpoints

### REST
- `GET /api/hello` - Health check

### GraphQL
- `POST /api/graphql` - GraphQL endpoint
- `GET /api/graphql` - GraphQL Playground (dev mode)

## Environment Variables

Production Docker environment:

```env
NODE_ENV=production
NITRO_PORT=3000
NITRO_HOST=0.0.0.0
```

## Rolldown Support

This example uses [Rolldown](https://rolldown.rs/), a Rust-based bundler for significantly faster builds:

```json
{
  "pnpm": {
    "overrides": {
      "vite": "npm:rolldown-vite@7.1.20"
    }
  }
}
```

**Benefits:**
- ⚡️ Faster builds (~10x improvement)
- 📦 Better tree-shaking
- 🔄 Same Vite API

## Learn More

- [nitro-graphql Documentation](https://github.com/productdevbook/nitro-graphql)
- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Pinia](https://pinia.vuejs.org/)
- [Pinia Colada](https://pinia-colada.esm.dev/)
- [Vue Router](https://router.vuejs.org/)
- [Nitro Documentation](https://v3.nitro.build/)

## License

MIT
