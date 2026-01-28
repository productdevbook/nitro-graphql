# Nuxt 5 + Nitro v3 + GraphQL Example

This example demonstrates using **nitro-graphql v2** with **Nuxt 5**, **Nitro v3**, and the new **Rolldown builder**.

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

## Tech Stack

| Technology | Version |
|------------|---------|
| Nuxt | 5 (pkg.pr.new) |
| Nitro | v3 |
| Vite | 8.0.0-beta.7 |
| Rolldown | Native builder |
| GraphQL Yoga | 5.18.0 |
| Vue | 3.5.26 |

## Features

- **Rolldown Builder** - Rust-powered bundler for ~10x faster builds
- **GraphQL Yoga** - Modern GraphQL server at `/api/graphql`
- **Auto-Discovery** - Automatic schema and resolver detection
- **TypeScript Types** - Auto-generated server and client types
- **GraphQL Playground** - Interactive API explorer

## Development

```bash
pnpm install
pnpm dev
```

## Project Structure

```
server/graphql/
├── schema.graphql    # GraphQL schema
└── hello.resolver.ts # Query resolvers
```

## Configuration

```typescript
// nuxt.config.ts
import graphql from 'nitro-graphql'

export default defineNuxtConfig({
  nitro: {
    builder: 'rolldown',
    modules: [
      graphql({
        framework: 'graphql-yoga',
      }),
    ],
  },
})
```

## Example Schema

**GraphQL Schema** (`server/graphql/schema.graphql`):

```graphql
type Query {
  hello: String!
  greeting(name: String!): String!
}
```

**Resolver** (`server/graphql/hello.resolver.ts`):

```typescript
import { defineQuery } from 'nitro-graphql/define'

export const helloQueries = defineQuery({
  hello: () => 'Hello from Nuxt + nitro-graphql!',
  greeting: (_, { name }) => `Hello ${name}!`,
})
```

## Try It

1. Run `pnpm dev`
2. Open http://localhost:3000
3. Visit http://localhost:3000/api/graphql for the playground

### Example Queries

```graphql
query {
  hello
  greeting(name: "World")
}
```

## Important Notes

> **Note**: This example uses pre-release versions of Nuxt 5 via `pkg.pr.new`. Wait for stable Nuxt 5 release for production use.

### Required Overrides

Since Nuxt 5 is in beta, `package.json` includes overrides:

```json
{
  "pnpm": {
    "overrides": {
      "nuxt": "https://pkg.pr.new/nuxt@33005",
      "nitro": "^3.0.1-alpha.2",
      "vite": "8.0.0-beta.7"
    }
  }
}
```

## Learn More

- [nitro-graphql Documentation](https://nitro-graphql.pages.dev)
- [Nuxt Documentation](https://nuxt.com)
- [Nitro Documentation](https://nitro.build)
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server)

## License

MIT
