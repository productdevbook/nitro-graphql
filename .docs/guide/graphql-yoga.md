---
title: GraphQL Yoga
category: Guide
---

# GraphQL Yoga

<FunctionInfo fn="graphqlYoga"/>

Complete guide to using GraphQL Yoga with Nitro GraphQL.

## What is GraphQL Yoga?

GraphQL Yoga is a modern, batteries-included GraphQL server with:
- Smaller bundle size
- Better performance
- Built-in features (file uploads, subscriptions)
- Simple configuration

## Installation

```bash
pnpm add nitro-graphql graphql-yoga graphql
```

## Configuration

```ts
// nitro.config.ts
export default defineNitroConfig({
  modules: ['nitro-graphql'],
  graphql: {
    framework: 'graphql-yoga',
  },
})
```

## Features

### Automatic Playground

Access at `http://localhost:3000/api/graphql`

### File Uploads

Supported out of the box:

```graphql
scalar Upload

type Mutation {
  uploadFile(file: Upload!): File!
}
```

### Subscriptions

WebSocket subscriptions included:

```ts
export const messageSubscriptions = defineSubscription({
  messageAdded: {
    subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(['MESSAGE_ADDED']),
  },
})
```

## Custom Configuration

```ts
// server/graphql/config.ts
export default defineGraphQLConfig({
  plugins: [
    // Add custom plugins
  ],
  maskedErrors: process.env.NODE_ENV === 'production',
})
```

## Next Steps

- [Apollo Server](/guide/apollo-server) - Alternative framework
- [Framework Comparison](/guide/framework-comparison)
- [Configuration Reference](/reference/config)

---

## Source

<SourceLinks fn="graphqlYoga"/>

## Contributors

<Contributors fn="graphqlYoga"/>

## Changelog

<Changelog fn="graphqlYoga"/>
