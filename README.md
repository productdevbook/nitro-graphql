# Nitro GraphQL Yoga Module

A standalone Nitro module that integrates GraphQL Yoga server into any Nitro application.

## Features

- 🚀 Easy GraphQL server setup with GraphQL Yoga
- 🔧 Auto-discovery of GraphQL schema files
- 📝 TypeScript support with type definitions
- 🎮 Apollo Sandbox integration (instead of GraphiQL)
- 🏥 Built-in health check endpoint
- 💾 Configurable cache headers for GET requests
- 🔌 Works with any Nitro-based application
- 🎯 Zero-config with sensible defaults

## Installation

```bash
npm install nitro-graphql-yoga
# or
pnpm add nitro-graphql-yoga
# or
yarn add nitro-graphql-yoga
```

## Usage

### 1. Add the module to your Nitro config

```ts
// nitro.config.ts
import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  modules: ['nitro-graphql-yoga'],
  
  // Optional configuration
  runtimeConfig: {
    graphqlYoga: {
      endpoint: '/api/graphql',        // default
      healthCheckEndpoint: '/api/graphql/health', // default
      playground: true,                // default (Apollo Sandbox)
      cors: false,                     // default
      cacheHeaders: {
        enabled: true,                 // default
        maxAge: 2592000,              // default (30 days)
      }
    }
  }
})
```

### 2. Create your GraphQL schema

The module automatically looks for schema files in these locations:
- `server/graphql/schema.ts`
- `server/graphql/index.ts`
- `graphql/schema.ts`
- `graphql/index.ts`

Example schema file:

```ts
// server/graphql/schema.ts
import { makeExecutableSchema } from '@graphql-tools/schema'

const typeDefs = `
  type Query {
    hello(name: String): String
    users: [User!]!
  }
  
  type User {
    id: ID!
    name: String!
    email: String!
  }
  
  type Mutation {
    createUser(input: CreateUserInput!): User!
  }
  
  input CreateUserInput {
    name: String!
    email: String!
  }
`

const resolvers = {
  Query: {
    hello: (_parent, args) => `Hello ${args.name || 'World'}!`,
    users: async (_, __, { storage }) => {
      // Access Nitro storage
      const users = await storage.getItem('users') || []
      return users
    },
  },
  Mutation: {
    createUser: async (_, { input }, { storage }) => {
      const users = await storage.getItem('users') || []
      const user = {
        id: Date.now().toString(),
        ...input,
      }
      users.push(user)
      await storage.setItem('users', users)
      return user
    },
  },
}

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})
```

### 3. Using the utilities

The module provides utilities for better developer experience:

```ts
// server/graphql/users.ts
import { defineGraphQLResolver, gql } from 'nitro-graphql-yoga'

export const userTypeDefs = gql`
  type User {
    id: ID!
    name: String!
  }
`

export const userResolvers = defineGraphQLResolver({
  Query: {
    users: async (_, __, { event, storage }) => {
      // Access H3 event and Nitro storage
      const auth = getCookie(event, 'auth-token')
      return storage.getItem('users')
    },
  },
})
```

## Context

The GraphQL context includes:
- `event`: The H3 event object
- `request`: The original request
- `storage`: Nitro storage instance

## Configuration Options

```ts
interface NitroGraphQLYogaOptions {
  // GraphQL endpoint path
  endpoint?: string // default: '/api/graphql'
  
  // Health check endpoint path
  healthCheckEndpoint?: string // default: '/api/graphql/health'
  
  // Enable/disable Apollo Sandbox
  playground?: boolean // default: true
  
  // CORS configuration
  cors?: {
    origin?: string | string[] | boolean
    credentials?: boolean
    methods?: string[]
  }
  
  // Cache headers configuration
  cacheHeaders?: {
    enabled?: boolean // default: true
    maxAge?: number   // default: 2592000 (30 days)
  }
}
```

## Advanced Usage

### Custom Configuration

You can create a custom GraphQL Yoga configuration file. The module will automatically look for it in these locations:
- `server/graphql/yoga.config.ts`
- `server/graphql-yoga.config.ts`
- `graphql/yoga.config.ts`
- `graphql-yoga.config.ts`

```ts
// server/graphql/yoga.config.ts
import type { YogaServerOptions } from 'graphql-yoga'
import { useCORS } from '@graphql-yoga/plugin-cors'
import { useResponseCache } from '@graphql-yoga/plugin-response-cache'

export default {
  // Add custom plugins
  plugins: [
    useCORS({
      origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
      credentials: true,
    }),
    useResponseCache({
      session: () => null,
      ttl: 60_000, // 1 minute
    }),
  ],
  
  // Override context
  context: async ({ request }) => {
    const event = request.$$event
    const user = await authenticateUser(event)
    
    return {
      event,
      request,
      storage: useStorage(),
      user,
      db: await connectDatabase(),
    }
  },
  
  // Custom error handling
  maskedErrors: {
    maskError: (error, message, isDev) => {
      if (error instanceof CustomError) {
        return error
      }
      return maskError(error, message, isDev)
    },
  },
} satisfies Partial<YogaServerOptions<any, any>>
```

### Custom Context

You can extend the context by modifying your schema:

```ts
// server/graphql/schema.ts
export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

// Add custom context enhancer
export const enhanceContext = async (context) => {
  return {
    ...context,
    // Add custom context properties
    db: await connectToDatabase(),
    user: await authenticateUser(context.event),
  }
}
```

### Multiple Schemas

You can compose multiple schemas:

```ts
// server/graphql/schema.ts
import { mergeSchemas } from '@graphql-tools/schema'
import { userSchema } from './users'
import { postSchema } from './posts'

export const schema = mergeSchemas({
  schemas: [userSchema, postSchema],
})
```

## License

MIT