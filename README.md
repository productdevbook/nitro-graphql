# Nitro GraphQL

> [!NOTE]
> This project is actively under development. We're always open to new ideas, different perspectives, and feature suggestions! If you have a suggestion, please first [open an issue](https://github.com/productdevbook/nitro-graphql/issues) to discuss it, then you can contribute with a PR.

A standalone Nitro module that integrates GraphQL servers into any Nitro application with automatic type generation, file watching, and seamless framework integration.

## Features

- 🚀 **Multi-Framework Support**: Works with GraphQL Yoga and Apollo Server
- 🔧 **Auto-Discovery**: Automatically scans and loads GraphQL schema and resolver files
- 📝 **Type Generation**: Automatic TypeScript type generation from GraphQL schemas (server & client)
- 🎮 **Apollo Sandbox**: Built-in GraphQL playground for development
- 🏥 **Health Check**: Built-in health check endpoint
- 🔌 **Universal Compatibility**: Works with any Nitro-based application (Nuxt, standalone Nitro, etc.)
- 🎯 **Zero Configuration**: Sensible defaults with optional customization
- 📂 **File-Based Organization**: Domain-driven resolver and schema organization
- 🔄 **Hot Reload**: Development mode with automatic schema and resolver updates
- 📦 **Optimized Bundling**: Smart chunking and dynamic imports for production
- 🌐 **Nuxt Integration**: First-class Nuxt.js support with dedicated module

## Installation

```bash
npm install nitro-graphql
# or
pnpm add nitro-graphql
# or
yarn add nitro-graphql
```

## Quick Start

### Standalone Nitro

```ts
// nitro.config.ts
import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  modules: ['nitro-graphql'],
  graphql: {
    framework: 'graphql-yoga', // or 'apollo-server'
  },
})
```

### Nuxt.js

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    'nitro-graphql/nuxt',
  ],
  nitro: {
    modules: ['nitro-graphql'],
    graphql: {
      framework: 'graphql-yoga',
    },
  },
})
```

## Project Structure

The module uses a domain-driven file structure under `server/graphql/`:

```
server/
├── graphql/
│   ├── schema.graphql              # Main schema with scalars and base types
│   ├── hello.resolver.ts           # Global resolvers
│   ├── users/
│   │   ├── user.graphql           # User schema definitions
│   │   ├── user-queries.resolver.ts # User query resolvers
│   │   └── create-user.resolver.ts  # User mutation resolvers
│   ├── posts/
│   │   ├── post.graphql           # Post schema definitions
│   │   ├── post-queries.resolver.ts # Post query resolvers
│   │   └── create-post.resolver.ts  # Post mutation resolvers
│   └── config.ts                   # Optional GraphQL configuration
```

## Basic Usage

### 1. Create Schema Files

```graphql
# server/graphql/schema.graphql
scalar DateTime
scalar JSON

type Query {
  hello: String!
  greeting(name: String!): String!
}

type Mutation
```

### 2. Create Resolvers

```ts
// server/graphql/hello.resolver.ts
import { defineResolver } from 'nitro-graphql'

export const define1 = defineResolver({
  Query: {
    hello: () => 'Hello from auto-discovered resolver!',
    greeting: (_parent, { name }) => `Hello, ${name}!`,
  },
})
```

### 3. Domain-Specific Schemas

```graphql
# server/graphql/users/user.graphql
type User {
  id: ID!
  name: String!
  email: String!
  createdAt: DateTime!
}

input CreateUserInput {
  name: String!
  email: String!
}

extend type Query {
  users: [User!]!
  user(id: ID!): User
}

extend type Mutation {
  createUser(input: CreateUserInput!): User!
}
```

### 4. Domain-Specific Resolvers

```ts
// server/graphql/users/user-queries.resolver.ts
import { defineResolver } from 'nitro-graphql'

export default defineResolver({
  Query: {
    users: async (_, __, { storage }) => {
      return await storage.getItem('users') || []
    },
    user: async (_, { id }, { storage }) => {
      const users = await storage.getItem('users') || []
      return users.find(user => user.id === id)
    }
  }
})
```

## Type Generation

The module automatically generates TypeScript types:

- **Server types**: `.nitro/types/nitro-graphql-server.d.ts`
- **Client types**: `.nitro/types/nitro-graphql-client.d.ts`
- **Auto-imports**: Available for `defineResolver` and other utilities

Types are automatically available in your resolvers:

```ts
// server/graphql/users/user-queries.resolver.ts
import { defineResolver } from 'nitro-graphql'

export default defineResolver({
  Query: {
    users: async (_, __, { storage }): Promise<User[]> => {
      return await storage.getItem('users') || []
    }
  }
})
```

## Configuration

### Runtime Configuration

```ts
// nitro.config.ts
export default defineNitroConfig({
  modules: ['nitro-graphql'],
  graphql: {
    framework: 'graphql-yoga', // or 'apollo-server'
  },
  runtimeConfig: {
    graphql: {
      endpoint: {
        graphql: '/api/graphql',        // GraphQL endpoint
        healthCheck: '/api/graphql/health' // Health check endpoint
      },
      playground: true,                 // Enable Apollo Sandbox
    }
  }
})
```

### Custom GraphQL Configuration

Create a configuration file for advanced customization:

```ts
// server/graphql/config.ts
import { defineGraphQLConfig } from 'nitro-graphql'

export default defineGraphQLConfig({
  // Custom GraphQL Yoga or Apollo Server configuration
  plugins: [
    // Add custom plugins
  ],
  context: async ({ request }) => {
    // Enhanced context with custom properties
    return {
      user: await authenticateUser(request),
      db: await connectDatabase(),
    }
  },
})
```

## Framework Support

### GraphQL Yoga

```ts
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
  },
})
```

### Apollo Server

```ts
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'apollo-server',
  },
})
```

## Development Features

### Hot Reload

The module watches for changes in GraphQL files and automatically:
- Regenerates TypeScript types
- Reloads the GraphQL schema
- Updates resolvers

### Health Check

Access the health check endpoint to verify your GraphQL server status:

```bash
curl http://localhost:3000/api/graphql/health
```

### Bundle Optimization

- Uses dynamic imports to prevent bundling large codegen dependencies
- Optimized chunk organization for GraphQL-related code
- Efficient resolver and schema loading

## Advanced Usage

### Custom Scalars

```ts
// server/graphql/scalars/DateTime.resolver.ts
import { GraphQLScalarType } from 'graphql'
import { Kind } from 'graphql/language'
import { defineResolver } from 'nitro-graphql'

export default defineResolver({
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    serialize: (value: Date) => value.toISOString(),
    parseValue: (value: string) => new Date(value),
    parseLiteral: (ast) => {
      if (ast.kind === Kind.STRING) {
        return new Date(ast.value)
      }
      return null
    }
  })
})
```

### Error Handling

```ts
// server/graphql/users/user-queries.resolver.ts
import { defineResolver } from 'nitro-graphql'

export default defineResolver({
  Query: {
    user: async (_, { id }, { storage }) => {
      try {
        const user = await storage.getItem(`user:${id}`)
        if (!user) {
          throw new Error(`User with id ${id} not found`)
        }
        return user
      } catch (error) {
        console.error('Error fetching user:', error)
        throw error
      }
    }
  }
})
```

## Nuxt Integration

For Nuxt.js applications, the module provides enhanced integration:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    'nitro-graphql/nuxt',
  ],
  nitro: {
    modules: ['nitro-graphql'],
    graphql: {
      framework: 'graphql-yoga',
    },
  },
})
```

Client-side GraphQL files are automatically detected in the `app/graphql/` directory.

## API Reference

### defineResolver

Utility for defining GraphQL resolvers with type safety:

```ts
import { defineResolver } from 'nitro-graphql'

export default defineResolver({
  Query: {
    // Query resolvers
  },
  Mutation: {
    // Mutation resolvers
  },
  // Custom type resolvers
})
```

### defineQuery

Utility for defining only Query resolvers:

```ts
import { defineQuery } from 'nitro-graphql'

export default defineQuery({
  users: async (_, __, { storage }) => {
    return await storage.getItem('users') || []
  },
  user: async (_, { id }, { storage }) => {
    const users = await storage.getItem('users') || []
    return users.find(user => user.id === id)
  }
})
```

### defineMutation

Utility for defining only Mutation resolvers:

```ts
import { defineMutation } from 'nitro-graphql'

export default defineMutation({
  createUser: async (_, { input }, { storage }) => {
    const users = await storage.getItem('users') || []
    const user = {
      id: Date.now().toString(),
      ...input,
      createdAt: new Date()
    }
    users.push(user)
    await storage.setItem('users', users)
    return user
  }
})
```

### defineSubscription

Utility for defining Subscription resolvers:

```ts
import { defineSubscription } from 'nitro-graphql'

export default defineSubscription({
  userAdded: {
    subscribe: () => pubsub.asyncIterator('USER_ADDED'),
  },
  postUpdated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator('POST_UPDATED'),
      (payload, variables) => payload.postUpdated.id === variables.postId
    ),
  }
})
```

### defineType

Utility for defining custom type resolvers:

```ts
import { defineType } from 'nitro-graphql'

export default defineType({
  User: {
    posts: async (parent, _, { storage }) => {
      const posts = await storage.getItem('posts') || []
      return posts.filter(post => post.authorId === parent.id)
    },
    fullName: (parent) => `${parent.firstName} ${parent.lastName}`,
  },
})
```

### defineSchema

Utility for defining custom schema types with validation. You can override schema types if needed. StandardSchema supported — Zod, Valibot, anything works:

```ts
import { defineSchema } from 'nitro-graphql'
import { z } from 'zod'

export default defineSchema({
  Todo: z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean(),
    createdAt: z.date(),
  }),
  User: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().min(0),
  }),
})
```

#### With Drizzle Schema

```ts
import { defineSchema } from 'nitro-graphql'
import { z } from 'zod'
import { userSchema } from './drizzle/user'
import { postSchema } from './drizzle/post'

export default defineSchema({
  Todo: z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean().default(false),
  }),
  User: userSchema, // Import from Drizzle schema
  Post: postSchema, // Import from Drizzle schema
})
```

#### With Valibot

```ts
import { defineSchema } from 'nitro-graphql'
import * as v from 'valibot'

export default defineSchema({
  Todo: v.object({
    id: v.string(),
    title: v.string(),
    completed: v.boolean(),
  }),
  User: v.object({
    id: v.string(),
    name: v.string(),
    email: v.pipe(v.string(), v.email()),
    age: v.pipe(v.number(), v.minValue(0)),
  }),
})
```

#### With Mixed Validation Libraries

```ts
import { defineSchema } from 'nitro-graphql'
import { z } from 'zod'
import * as v from 'valibot'
import { userSchema } from './drizzle/user'

export default defineSchema({
  // Zod schema
  Todo: z.object({
    id: z.string(),
    title: z.string(),
  }),
  // Valibot schema
  Comment: v.object({
    id: v.string(),
    content: v.string(),
    authorId: v.string(),
  }),
  // Drizzle schema
  User: userSchema,
})
```

### defineGraphQLConfig

Utility for custom GraphQL server configuration:

```ts
import { defineGraphQLConfig } from 'nitro-graphql'

export default defineGraphQLConfig({
  plugins: [],
  context: async ({ request }) => ({}),
  // Framework-specific options
})
```

## Examples

Check out the example projects:

- **Standalone Nitro**: [`playground/`](playground/)
- **Nuxt.js Integration**: [`playground-nuxt/`](playground-nuxt/)

Both examples include working GraphQL schemas, resolvers, and demonstrate the module's capabilities.

## Development

### Scripts

- `pnpm build` - Build the module
- `pnpm dev` - Watch mode with automatic rebuilding
- `pnpm lint` - ESLint with auto-fix
- `pnpm playground` - Run the Nitro playground example
- `pnpm release` - Build, version bump, and publish

### Requirements

- Node.js 20.x or later
- pnpm (required package manager)

## Community & Contributing

> [!TIP]
> **Want to contribute?** We believe you can play a role in the growth of this project!

### 🎯 How You Can Contribute

- **💡 Share your ideas**: Use [GitHub Issues](https://github.com/productdevbook/nitro-graphql/issues) for new feature suggestions
- **🐛 Report bugs**: Report issues you encounter in detail
- **📖 Improve documentation**: Enhance README, examples, and guides
- **🔧 Code contributions**: Develop bug fixes and new features
- **🌟 Support the project**: Support the project by giving it a star

### 💬 Discussion and Support

- **GitHub Issues**: Feature requests and bug reports
- **GitHub Discussions**: General discussions and questions
- **Pull Requests**: Code contributions

### 🚀 Contribution Process

1. **Open an issue**: Let's discuss what you want to do first
2. **Fork & Branch**: Fork the project and create a feature branch
3. **Write code**: Develop according to existing code standards
4. **Test**: Test your changes
5. **Send PR**: Create a pull request with detailed description

> [!IMPORTANT]
> Please don't forget to read the [Contribution Guidelines](CONTRIBUTING.md) document before contributing.

---

### 🌟 Thank You

Thank you for using and developing this project. Every contribution makes the GraphQL ecosystem stronger!

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/productdevbook/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/productdevbook/static/sponsors.svg'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © 2023 [productdevbook](https://github.com/productdevbook)