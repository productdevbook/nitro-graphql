# Nuxt + nitro-graphql Example

This example demonstrates using nitro-graphql with Nuxt 4.

## Setup

```bash
pnpm install
pnpm dev
```

## Features

- GraphQL Yoga server at `/api/graphql`
- Auto-generated TypeScript types
- GraphQL Playground (Apollo Sandbox)

## Structure

```
server/graphql/
├── schema.graphql    # GraphQL schema
└── hello.resolver.ts # Query resolvers
```

## Try it

1. Run `pnpm dev`
2. Open http://localhost:3000
3. Or visit http://localhost:3000/api/graphql for the playground
