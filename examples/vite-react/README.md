# Nitro GraphQL + React + Vite Example

Full-stack **React** application with **Vite**, **Nitro**, and **GraphQL**. Demonstrates modern React patterns, type-safe GraphQL, and production-ready Docker deployment.

## Get Started

Clone this example using [giget](https://github.com/unjs/giget):

```bash
npx giget@latest gh:productdevbook/nitro-graphql/examples/vite-react my-react-app
cd my-react-app
pnpm install
```

Or using pnpm:

```bash
pnpm dlx giget@latest gh:productdevbook/nitro-graphql/examples/vite-react my-react-app
```

## Features

- ⚛️ **React 19** - Latest React with modern hooks
- ⚡️ **Vite** - Lightning fast frontend tooling
- 🚀 **Nitro** - Universal server framework
- 🔺 **GraphQL** - Type-safe API with union types
- 🔄 **TanStack React Query** - Powerful data synchronization
- 🎨 **Tailwind CSS 4** - Utility-first styling
- 🛣️ **React Router v7** - Client-side routing
- 🐳 **Docker Ready** - Multi-runtime support (Node.js & Bun)
- 📦 **Auto-Generated Types** - Full type safety end-to-end

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript |
| State | TanStack React Query 5.90.10 |
| Routing | React Router 7.9.6 |
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
examples/vite-react/
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
│   ├── components/              # React components
│   │   ├── ErrorBoundary.tsx
│   │   └── UserCard.tsx
│   ├── contexts/                # React contexts
│   │   └── ErrorOverlay.tsx
│   ├── hooks/                   # Custom hooks
│   │   └── useUser.ts
│   ├── graphql/                 # GraphQL client
│   │   └── default/
│   │       └── sdk.ts           # Auto-generated SDK
│   ├── pages/                   # Page components
│   │   ├── HomePage.tsx
│   │   └── UserPage.tsx
│   ├── router/                  # React Router config
│   │   └── index.tsx
│   └── main.tsx                 # Entry point
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

**React Component:**
```typescript
const { data } = useGetUserQuery({ id: userId })

if (data?.__typename === 'User') {
  // TypeScript knows data has User fields
  return <div>{data.name}</div>
}

if (data?.__typename === 'UserNotFoundError') {
  // TypeScript knows data has error fields
  return <div>Error: {data.message}</div>
}
```

### TanStack React Query Integration

The example uses auto-generated hooks powered by React Query:

```typescript
// src/hooks/useUser.ts
import { useGetUserQuery } from '#graphql/client'

export function useUser(id: string) {
  return useGetUserQuery(
    { id },
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  )
}
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
import react from '@vitejs/plugin-react'
import graphql from 'nitro-graphql'
import nitro from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    graphql({
      framework: 'graphql-yoga',
    }),
    nitro(),
  ],
})
```

**Important**: The `graphql()` plugin must be placed **before** `nitro()`.

### Client-Side Routing

The example uses React Router v7 with lazy-loaded routes:

```typescript
// src/router/index.tsx
const HomePage = lazy(() => import('../pages/HomePage'))
const UserPage = lazy(() => import('../pages/UserPage'))

export function Router() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/user/:id" element={<UserPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

## Performance Optimizations

- **Code Splitting**: React lazy loading for routes
- **Optimized Builds**: Multi-stage Docker builds
  - Node.js build: ~61 KB
  - Bun build: ~48 KB (22% smaller)
- **Query Caching**: TanStack React Query
- **Static Assets**: Efficient caching headers
- **Tree Shaking**: Rolldown optimization

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

## Learn More

- [nitro-graphql Documentation](https://github.com/productdevbook/nitro-graphql)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TanStack Query](https://tanstack.com/query)
- [React Router](https://reactrouter.com/)
- [Nitro Documentation](https://v3.nitro.build/)

## License

MIT
