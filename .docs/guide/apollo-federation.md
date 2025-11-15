---
title: Apollo Federation
category: Guide
---

# Apollo Federation

<FunctionInfo fn="apolloFederation"/>

Build distributed GraphQL architectures with Apollo Federation support.

## What is Federation?

Apollo Federation allows you to split your GraphQL API across multiple services (subgraphs) that are composed into a single supergraph.

## Setup

### 1. Install Dependencies

```bash
pnpm add @apollo/server @apollo/subgraph @apollo/utils.withrequired graphql
```

### 2. Configure Subgraph

```ts
// nitro.config.ts
export default defineNitroConfig({
  modules: ['nitro-graphql'],
  graphql: {
    framework: 'apollo-server',
    federation: {
      enabled: true,
      serviceName: 'users-service',
    },
  },
})
```

### 3. Define Schema with Federation

```graphql
# server/graphql/schema.graphql
type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}

extend type Post @key(fields: "id") {
  id: ID! @external
  author: User!
}
```

### 4. Implement Reference Resolvers

```ts
// server/graphql/users.resolver.ts
export const userResolver = defineResolver({
  User: {
    __resolveReference: (reference) => {
      return findUser(reference.id)
    },
  },
  Post: {
    author: post => findUser(post.authorId),
  },
})
```

## Example: Multi-Service Setup

### Users Service

```ts
// users-service/nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'apollo-server',
    federation: {
      enabled: true,
      serviceName: 'users',
    },
  },
})
```

```graphql
type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}
```

### Posts Service

```ts
// posts-service/nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'apollo-server',
    federation: {
      enabled: true,
      serviceName: 'posts',
    },
  },
})
```

```graphql
extend type User @key(fields: "id") {
  id: ID! @external
  posts: [Post!]!
}

type Post @key(fields: "id") {
  id: ID!
  title: String!
  content: String!
  authorId: ID!
}
```

## Gateway Setup

Use Apollo Gateway or Apollo Router to compose subgraphs.

## Next Steps

- [Apollo Server Guide](/guide/apollo-server)
- [Framework Comparison](/guide/framework-comparison)
- [Playground Example](https://github.com/productdevbook/nitro-graphql/tree/main/playgrounds/federation)

---

## Source

<SourceLinks fn="apolloFederation"/>

## Contributors

<Contributors fn="apolloFederation"/>

## Changelog

<Changelog fn="apolloFederation"/>
