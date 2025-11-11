# Nitro + Vite + GraphQL

A modern full-stack starter template combining [Vite](https://vitejs.dev/), [Nitro](https://v3.nitro.build/), and [GraphQL](https://github.com/productdevbook/nitro-graphql).

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/productdevbook/vite-nitro-graphql?file=server%2Fgraphql%2Fuser%2FgetUser.resolver.ts)

## Features

- ⚡️ **Vite** - Lightning fast frontend build tool
- 🚀 **Nitro** - Universal server framework
- 🔺 **GraphQL** - Type-safe API with [nitro-graphql](https://github.com/productdevbook/nitro-graphql)
- 📦 **TypeScript** - Full type safety
- 🎨 **Interactive Demo** - Built-in GraphQL playground
- 🪶 **Lightweight** - Tree-shakeable, minimal bundle size
- 🌐 **Universal** - Deploy anywhere Nitro supports
- 🔄 **End-to-End Type Safety** - From GraphQL schema to client
- 📦 **Tiny Bundle** - Optimized by nitro-graphql's tree-shaking capabilities

## Tech Stack

- **Frontend**: Vite + TypeScript
- **Backend**: Nitro v3
- **API**: GraphQL Yoga + nitro-graphql
- **Schema**: Code-first GraphQL with `.graphql` files

## Getting Started

### Install dependencies

```bash
npm install
# or
pnpm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the interactive demo.

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Project Structure

```
├── server/
│   └── graphql/
│       ├── config.ts          # GraphQL configuration
│       ├── schema.ts           # Schema definition
│       └── user/
│           ├── user.graphql    # User type schema
│           ├── getUser.resolver.ts
│           ├── createUser.resolver.ts
│           └── userStore.ts    # Mock data
├── src/
│   ├── main.ts                 # App entry point
│   └── app.ts                  # Demo UI
└── index.html
```

## GraphQL API

The demo includes a simple User API with:

### Queries

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

### Mutations

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

## Deployment

This starter supports all Nitro deployment presets. Check the [Nitro deployment documentation](https://v3.nitro.build/deploy) for more details.

```bash
# Build for production
npm run build

# Deploy to your favorite platform
# Vercel, Netlify, Cloudflare Workers, AWS, etc.
```

## Learn More

- [Vite Documentation](https://vitejs.dev/)
- [Nitro Documentation](https://v3.nitro.build/)
- [nitro-graphql](https://github.com/productdevbook/nitro-graphql)
- [GraphQL](https://graphql.org/)

## License

MIT
