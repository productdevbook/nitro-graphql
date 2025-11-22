# Nitro GraphQL + Vite Example

A modern full-stack starter template combining **Vite**, **Nitro**, and **GraphQL**. Demonstrates pure Vite + Nitro integration with GraphQL API and interactive frontend.

## Get Started

Clone this example using [giget](https://github.com/unjs/giget):

```bash
npx giget@latest gh:productdevbook/nitro-graphql/examples/vite my-vite-app
cd my-vite-app
pnpm install
```

Or using pnpm:

```bash
pnpm dlx giget@latest gh:productdevbook/nitro-graphql/examples/vite my-vite-app
```

## Features

- ⚡️ **Vite** - Lightning fast frontend development
- 🚀 **Nitro** - Universal server framework
- 🔺 **GraphQL** - Type-safe API layer
- 📦 **TypeScript** - Full end-to-end type safety
- 🎨 **Interactive Demo** - Built-in GraphQL playground UI
- 🪶 **Lightweight** - Minimal dependencies
- 🔄 **Rolldown Support** - Experimental Rust-based bundler support

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + TypeScript |
| Backend | Nitro 3 + H3 v2 |
| GraphQL | GraphQL Yoga 5.16.2 |
| Bundler | Vite (or Rolldown experimental) |

## Development Setup

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Access the app at: http://localhost:3000

GraphQL endpoint: http://localhost:3000/api/graphql

## Build & Deploy

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
examples/vite/
├── server/
│   ├── api/
│   │   └── hello.ts            # REST API example
│   └── graphql/
│       ├── user/
│       │   ├── user.graphql    # User type schema
│       │   ├── getUser.resolver.ts
│       │   ├── createUser.resolver.ts
│       │   └── userStore.ts    # In-memory data store
│       ├── config.ts            # GraphQL server config
│       ├── context.d.ts         # H3 context types
│       └── schema.ts            # Schema definition
├── src/
│   ├── main.ts                  # Frontend entry
│   └── app.ts                   # Interactive demo UI
├── public/                      # Static assets
├── index.html                   # HTML entry
└── vite.config.ts              # Vite + Nitro config
```

## GraphQL Operations

### Get User

```graphql
query GetUser($id: ID!) {
  getUser(id: $id) {
    id
    email
    name
    createdAt
  }
}
```

### Create User

```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    email
    name
    createdAt
  }
}
```

## Key Concepts

### Vite Integration

This example uses `nitro-graphql` as a Vite plugin:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import graphql from 'nitro-graphql'
import nitro from 'nitro/vite'

export default defineConfig({
  plugins: [
    graphql({
      framework: 'graphql-yoga',
    }),
    nitro(),
  ],
})
```

**Important**: The `graphql()` plugin must be placed **before** `nitro()` plugin.

### Auto-Discovery

The module automatically discovers:
- GraphQL schemas from `server/graphql/**/*.graphql`
- Resolvers from `server/graphql/**/*.resolver.ts`
- Generates TypeScript types in `.nitro/types/`

### Type Generation

Generated types are available via virtual imports:
- `#graphql/server` - Server-side resolver types
- `#graphql/client` - Client-side query/mutation types

### In-Memory Data Store

The example uses a simple in-memory store (see `server/graphql/user/userStore.ts`):

```typescript
// server/graphql/user/userStore.ts
const users = new Map()

export const userStore = {
  get: (id: string) => users.get(id),
  set: (id: string, user: any) => users.set(id, user),
  getAll: () => Array.from(users.values()),
}
```

Replace with a real database for production use.

## Rolldown Support

This example includes experimental support for [Rolldown](https://rolldown.rs/), a Rust-based bundler:

```json
"pnpm": {
  "overrides": {
    "vite": "npm:rolldown-vite@latest"
  }
}
```

**Benefits:**
- ⚡️ Faster builds (~10x improvement)
- 📦 Better tree-shaking
- 🔄 Same Vite API

## Deployment

This starter supports all Nitro deployment presets:

- Vercel
- Netlify
- Cloudflare Workers
- AWS Lambda
- Node.js
- Docker
- And more...

Check the [Nitro deployment docs](https://v3.nitro.build/deploy) for details.

## Learn More

- [nitro-graphql Documentation](https://github.com/productdevbook/nitro-graphql)
- [Vite Documentation](https://vitejs.dev/)
- [Nitro Documentation](https://v3.nitro.build/)
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server)
- [Rolldown](https://rolldown.rs/)

## License

MIT
