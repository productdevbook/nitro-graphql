# Nuxt + nitro-graphql Example

This example demonstrates using nitro-graphql with Nuxt 4.

## Get Started

Clone this example using [giget](https://github.com/unjs/giget):

```bash
npx giget@latest gh:productdevbook/nitro-graphql/examples/nuxt my-nuxt-app
cd my-nuxt-app
pnpm install
```

Or using pnpm:

```bash
pnpm dlx giget@latest gh:productdevbook/nitro-graphql/examples/nuxt my-nuxt-app
```

## Development

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
