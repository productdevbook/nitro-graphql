# Nitro GraphQL + Apollo Server Example

Nitro GraphQL example using Apollo Server instead of GraphQL Yoga.

## Get Started

Clone this example using [giget](https://github.com/unjs/giget):

```bash
npx giget@latest gh:productdevbook/nitro-graphql/examples/nitro-apollo my-apollo-app
cd my-apollo-app
pnpm install
```

Or using pnpm:

```bash
pnpm dlx giget@latest gh:productdevbook/nitro-graphql/examples/nitro-apollo my-apollo-app
```

## Development

```bash
pnpm install
pnpm dev
```

GraphQL Playground: http://localhost:3000/api/graphql

## Configuration

This example uses Apollo Server as the GraphQL framework:

```typescript
// nitro.config.ts
import graphql from 'nitro-graphql'
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  modules: [
    graphql({
      framework: 'apollo-server',
    }),
  ],
})
```

## License

MIT
