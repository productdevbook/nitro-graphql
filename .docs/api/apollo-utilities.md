---
title: Apollo Utilities
category: API
related:
  - configuration
  - resolver-functions
description: Complete reference for Apollo Server integration and Apollo Federation utilities.
---

# Apollo Utilities API Reference

<FunctionInfo fn="apolloUtilities"/>

Complete reference for Apollo Server integration and Apollo Federation utilities.

---

## Overview

Nitro GraphQL provides utilities for Apollo Server integration and Apollo Federation support through the `nitro-graphql/utils/apollo` module.

---

## Apollo Server Integration

### startServerAndCreateH3Handler()

Create an H3 event handler for Apollo Server.

#### Signature

```typescript
function startServerAndCreateH3Handler<TContext extends BaseContext>(
  server: ApolloServer<TContext> | (() => ApolloServer<TContext>),
  options?: H3HandlerOptions<TContext>
): EventHandler
```

#### Parameters

**server**: `ApolloServer<TContext> | (() => ApolloServer<TContext>)`
- Apollo Server instance or factory function
- Can be a lazy-loaded server for better cold start performance

**options**: `H3HandlerOptions<TContext>`
```typescript
interface H3HandlerOptions<TContext extends BaseContext> {
  // Context function to create GraphQL context from H3 event
  context?: ContextFunction<[H3ContextFunctionArgument], TContext>

  // WebSocket hooks (for subscriptions)
  websocket?: Partial<Hooks>

  // Whether server has already been started
  serverAlreadyStarted?: boolean
}

interface H3ContextFunctionArgument {
  event: H3Event
}

type ContextFunction<Args extends any[], TContext>
  = (...args: Args) => TContext | Promise<TContext>
```

#### Return Type

Returns an H3 `EventHandler` that can be used with Nitro routes.

#### Examples

**Basic Usage:**

```typescript
import { ApolloServer } from '@apollo/server'
import { defineEventHandler } from 'nitro/h3'
import { startServerAndCreateH3Handler } from 'nitro-graphql/utils/apollo'

const server = new ApolloServer({
  typeDefs,
  resolvers
})

export default defineEventHandler(
  startServerAndCreateH3Handler(server, {
    serverAlreadyStarted: false
  })
)
```

**With Context:**

```typescript
import { ApolloServer } from '@apollo/server'
import { startServerAndCreateH3Handler } from 'nitro-graphql/utils/apollo'

const server = new ApolloServer({
  typeDefs,
  resolvers
})

export default startServerAndCreateH3Handler(server, {
  context: async ({ event }) => ({
    // Access H3 event
    auth: event.context.auth,
    db: await getDatabase(),
    event
  })
})
```

**With Lazy Server:**

```typescript
import { ApolloServer } from '@apollo/server'
import { startServerAndCreateH3Handler } from 'nitro-graphql/utils/apollo'

// Factory function for lazy initialization
function createServer() {
  return new ApolloServer({
    typeDefs,
    resolvers
  })
}

export default startServerAndCreateH3Handler(createServer, {
  context: async ({ event }) => ({
    auth: event.context.auth
  })
})
```

**With WebSocket Support:**

```typescript
import { ApolloServer } from '@apollo/server'
import { startServerAndCreateH3Handler } from 'nitro-graphql/utils/apollo'

const server = new ApolloServer({
  typeDefs,
  resolvers
})

export default startServerAndCreateH3Handler(server, {
  context: async ({ event }) => ({
    pubsub: event.context.pubsub
  }),
  websocket: {
    open(peer) {
      console.log('WebSocket opened:', peer.id)
    },
    message(peer, message) {
      console.log('Message received:', message)
    },
    close(peer) {
      console.log('WebSocket closed:', peer.id)
    }
  }
})
```

---

## Apollo Federation

### buildSubgraphSchema()

Build a federated GraphQL subgraph schema. This is a re-export from `@apollo/subgraph`.

#### Signature

```typescript
function buildSubgraphSchema(
  options: SubgraphConfig
): GraphQLSchema

interface SubgraphConfig {
  typeDefs: DocumentNode | DocumentNode[]
  resolvers?: IResolvers | IResolvers[]
}
```

#### Parameters

**typeDefs**: `DocumentNode | DocumentNode[]`
- GraphQL schema definition with federation directives
- Must include `@key`, `@extends`, etc. for federation

**resolvers**: `IResolvers | IResolvers[]`
- Resolver implementations including reference resolvers

#### Return Type

Returns a `GraphQLSchema` configured for Apollo Federation.

#### Examples

**Basic Subgraph:**

```typescript
import { parse } from 'graphql'
import { buildSubgraphSchema } from 'nitro-graphql/utils/apollo'

const typeDefs = parse(`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable"])

  type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
  }
`)

const resolvers = {
  Query: {
    user: async (_parent, { id }, context) => {
      return await context.db.users.findById(id)
    },
    users: async (_parent, _args, context) => {
      return await context.db.users.findAll()
    }
  },
  User: {
    // Reference resolver for federation
    __resolveReference: async (reference, context) => {
      return await context.db.users.findById(reference.id)
    }
  }
}

const schema = buildSubgraphSchema({
  typeDefs,
  resolvers
})
```

**Extending Types from Other Subgraphs:**

```typescript
import { parse } from 'graphql'
import { buildSubgraphSchema } from 'nitro-graphql/utils/apollo'

const typeDefs = parse(`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@external"])

  # Extend User type from users subgraph
  type User @key(fields: "id") {
    id: ID! @external
    posts: [Post!]!
  }

  type Post @key(fields: "id") {
    id: ID!
    title: String!
    content: String!
    authorId: ID!
    author: User!
  }

  type Query {
    post(id: ID!): Post
    posts: [Post!]!
  }
`)

const resolvers = {
  Query: {
    post: async (_parent, { id }, context) => {
      return await context.db.posts.findById(id)
    },
    posts: async (_parent, _args, context) => {
      return await context.db.posts.findAll()
    }
  },
  User: {
    // Extend User with posts field
    posts: async (user, _args, context) => {
      return await context.db.posts.findByUserId(user.id)
    }
  },
  Post: {
    __resolveReference: async (reference, context) => {
      return await context.db.posts.findById(reference.id)
    },
    author: async (post) => {
      // Return reference to User from users subgraph
      return { __typename: 'User', id: post.authorId }
    }
  }
}

const schema = buildSubgraphSchema({
  typeDefs,
  resolvers
})
```

---

## Federation Configuration

### FederationConfig

Configure Apollo Federation support in Nitro GraphQL.

```typescript
interface FederationConfig {
  // Enable Apollo Federation subgraph support
  enabled: boolean

  // Service name for federation (used in subgraph config)
  serviceName?: string

  // Service version for federation
  serviceVersion?: string

  // Service URL for federation gateway
  serviceUrl?: string
}
```

#### Example Configuration

```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'apollo-server',
    federation: {
      enabled: true,
      serviceName: 'users-service',
      serviceVersion: '1.0.0',
      serviceUrl: 'http://localhost:3001/api/graphql'
    }
  }
})
```

---

## Federation Types

### Reference Resolvers

Type definition for reference resolvers:

```typescript
interface ReferenceResolver<TContext> {
  __resolveReference: (
    reference: any,
    context: TContext,
    info: GraphQLResolveInfo
  ) => any | Promise<any>
}
```

#### Example

```typescript
import type { UserResolvers } from '#graphql/server'

export const userResolvers: UserResolvers = defineField({
  User: {
    __resolveReference: async (reference, context) => {
      // reference contains fields marked with @key
      return await context.db.users.findById(reference.id)
    },

    // Regular field resolvers
    email: (parent, _args, context) => {
      // Only return email for authenticated users
      if (context.auth?.userId === parent.id) {
        return parent.email
      }
      return null
    }
  }
})
```

---

## Complete Federation Example

### Users Subgraph

```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'apollo-server',
    federation: {
      enabled: true,
      serviceName: 'users-service',
      serviceVersion: '1.0.0',
      serviceUrl: 'http://localhost:3001/api/graphql'
    }
  }
})
```

```graphql
# server/graphql/users.graphql
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
  createdAt: DateTime!
}

type Query {
  user(id: ID!): User
  users: [User!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
}

input CreateUserInput {
  name: String!
  email: String!
}
```

```typescript
// server/graphql/users.resolver.ts
export const userResolvers = defineResolver({
  Query: {
    user: async (_parent, { id }, context) => {
      return await context.db.users.findById(id)
    },
    users: async (_parent, _args, context) => {
      return await context.db.users.findAll()
    }
  },
  Mutation: {
    createUser: async (_parent, { input }, context) => {
      return await context.db.users.create(input)
    }
  },
  User: {
    __resolveReference: async (reference, context) => {
      return await context.db.users.findById(reference.id)
    }
  }
})
```

### Posts Subgraph

```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'apollo-server',
    federation: {
      enabled: true,
      serviceName: 'posts-service',
      serviceVersion: '1.0.0',
      serviceUrl: 'http://localhost:3002/api/graphql'
    }
  }
})
```

```graphql
# server/graphql/posts.graphql
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@external"])

type User @key(fields: "id") {
  id: ID! @external
  posts: [Post!]!
}

type Post @key(fields: "id") {
  id: ID!
  title: String!
  content: String!
  published: Boolean!
  authorId: ID!
  author: User!
  createdAt: DateTime!
}

type Query {
  post(id: ID!): Post
  posts(authorId: ID): [Post!]!
}

type Mutation {
  createPost(input: CreatePostInput!): Post!
}

input CreatePostInput {
  title: String!
  content: String!
  authorId: ID!
}
```

```typescript
// server/graphql/posts.resolver.ts
export const postResolvers = defineResolver({
  Query: {
    post: async (_parent, { id }, context) => {
      return await context.db.posts.findById(id)
    },
    posts: async (_parent, { authorId }, context) => {
      if (authorId) {
        return await context.db.posts.findByUserId(authorId)
      }
      return await context.db.posts.findAll()
    }
  },
  Mutation: {
    createPost: async (_parent, { input }, context) => {
      return await context.db.posts.create(input)
    }
  },
  Post: {
    __resolveReference: async (reference, context) => {
      return await context.db.posts.findById(reference.id)
    },
    author: (post) => {
      // Return reference to User from users subgraph
      return { __typename: 'User', id: post.authorId }
    }
  },
  User: {
    // Extend User type with posts field
    posts: async (user, _args, context) => {
      return await context.db.posts.findByUserId(user.id)
    }
  }
})
```

### Gateway Configuration

```typescript
// gateway/index.ts
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway'
import { ApolloServer } from '@apollo/server'

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      {
        name: 'users-service',
        url: 'http://localhost:3001/api/graphql'
      },
      {
        name: 'posts-service',
        url: 'http://localhost:3002/api/graphql'
      }
    ]
  })
})

const server = new ApolloServer({
  gateway
})
```

---

## Best Practices

### 1. Use Reference Resolvers

Always implement `__resolveReference` for federated types:

```typescript
export const userResolvers = defineField({
  User: {
    __resolveReference: async (reference, context) => {
      // Resolve entity from its key fields
      return await context.db.users.findById(reference.id)
    }
  }
})
```

### 2. Return Type References

When referencing types from other subgraphs, return a reference object:

```typescript
export const postResolvers = defineField({
  Post: {
    author: (post) => {
      // Don't resolve the entire user, return a reference
      return { __typename: 'User', id: post.authorId }
    }
  }
})
```

### 3. Use @external for Extended Fields

Mark fields from other subgraphs as external:

```graphql
type User @key(fields: "id") {
  id: ID! @external
  posts: [Post!]!
}
```

### 4. Test Subgraphs Independently

Each subgraph should work as a standalone GraphQL API:

```bash
# Test users subgraph
curl http://localhost:3001/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { id name } }"}'

# Test posts subgraph
curl http://localhost:3002/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ posts { id title } }"}'
```

### 5. Version Your Subgraphs

Use semantic versioning for subgraph services:

```typescript
export default defineNitroConfig({
  graphql: {
    federation: {
      enabled: true,
      serviceName: 'users-service',
      serviceVersion: '1.2.0' // Semantic versioning
    }
  }
})
```

---

## Troubleshooting

### Federation Not Working

**Problem**: Subgraph doesn't register with gateway

**Solutions**:
1. Verify `federation.enabled: true` in config
2. Check service URL is accessible from gateway
3. Ensure `@apollo/subgraph` is installed: `pnpm add @apollo/subgraph`
4. Check gateway logs for connection errors

### Reference Resolver Not Called

**Problem**: `__resolveReference` not being invoked

**Solutions**:
1. Ensure type has `@key` directive
2. Verify `__resolveReference` is in correct resolver
3. Check gateway is configured to use the subgraph
4. Test subgraph directly for reference queries

### Type Extension Issues

**Problem**: Extended fields not resolving

**Solutions**:
1. Mark original fields as `@external`
2. Ensure `@key` fields match across subgraphs
3. Verify reference resolver returns correct fields
4. Check field resolvers are in correct type

### Context Not Available

**Problem**: Context undefined in resolvers

**Solutions**:
1. Configure context function in `startServerAndCreateH3Handler`
2. Ensure context returns correct shape
3. Check H3 event context is properly set up
4. Verify middleware is running before GraphQL handler

---

## Source
<SourceLinks fn="apolloUtilities"/>

## Contributors
<Contributors fn="apolloUtilities"/>

## Changelog
<Changelog fn="apolloUtilities"/>
