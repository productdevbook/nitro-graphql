# Nitro GraphQL Yoga Module

> [!NOTE]
> This project is actively under development. We're always open to new ideas, different perspectives, and feature suggestions! If you have a suggestion, please first [open an issue](https://github.com/productdevbook/nitro-graphql/issues) to discuss it, then you can contribute with a PR.

A standalone Nitro module that integrates GraphQL Yoga server into any Nitro application with automatic type generation and file watching.

## Features

- 🚀 Easy GraphQL server setup with GraphQL Yoga
- 🔧 Auto-discovery of GraphQL schema and resolver files
- 📝 Automatic TypeScript type generation from GraphQL schemas
- 🎮 Apollo Sandbox integration (instead of GraphiQL)
- 🏥 Built-in health check endpoint
- 💾 Configurable cache headers for better performance
- 🔌 Works with any Nitro-based application
- 🎯 Zero-config with sensible defaults
- 📂 File-based resolver organization
- 🔄 Hot reload in development mode
- 📦 Optimized bundle size with dynamic imports
- 🏷️ Minimal logging with consistent tagging

## Installation

```bash
npm install nitro-graphql
# or
pnpm add nitro-graphql
# or
yarn add nitro-graphql
```

## Usage

### 1. Add the module to your Nitro config

```ts
// nitro.config.ts
import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  modules: ['nitro-graphql'],

  // Optional configuration
  graphqlYoga: {
    endpoint: '/api/graphql', // default
    playground: true, // default (Apollo Sandbox)
    cors: false, // default
    cacheHeaders: {
      enabled: true, // default
      maxAge: 604800, // default (1 week)
    },
    client: {
      enabled: false, // default
      outputPath: undefined, // Will default to .nitro/types/graphql-client.generated.ts
      watchPatterns: undefined, // Will default to src/**/*.{graphql,gql} excluding server/graphql
      config: {
        documentMode: 'string',
        emitLegacyCommonJSImports: false,
        useTypeImports: true,
        enumsAsTypes: true,
      }
    }
  }
})
```

### 2. Create your GraphQL schema files

The module automatically scans for GraphQL files in your `graphql/` directory using a domain-driven structure:

#### Main Schema File
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

#### Domain-specific Schema Files
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

#### Domain-based Resolver Files
```ts
// server/graphql/users/user-queries.ts
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

```ts
// server/graphql/users/create-user.ts
import { defineResolver } from 'nitro-graphql'

export default defineResolver({
  Mutation: {
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
  }
})
```

### 3. Using the utilities

The module provides utilities for better developer experience:

```ts
// server/graphql/hello.ts
import { defineResolver } from 'nitro-graphql'

export default defineResolver({
  Query: {
    hello: () => 'Hello World!',
    greeting: (_, { name }) => `Hello ${name}!`
  }
})
```

### 4. Type Generation

The module automatically generates TypeScript types from your GraphQL schema:

- **Server types**: `.nitro/types/graphql-types.generated.ts`
- **Type declarations**: `.nitro/types/graphql.d.ts`

These types are automatically available in your resolvers:

```ts
import type { QueryResolvers } from '#build/graphql-types.generated'
// server/graphql/users/user-queries.ts
import { defineResolver } from 'nitro-graphql'

export default defineResolver({
  Query: {
    users: async (_, __, { storage }): Promise<User[]> => {
      return await storage.getItem('users') || []
    }
  } satisfies QueryResolvers
})
```

## File Structure

The module follows a domain-driven file structure:

```
server/
├── graphql/
│   ├── schema.graphql           # Main schema file with scalars and base types
│   ├── hello.ts                 # Global resolvers
│   ├── users/
│   │   ├── user.graphql         # User schema definitions
│   │   ├── user-queries.ts      # User query resolvers
│   │   └── create-user.ts       # User mutation resolvers
│   ├── todos/
│   │   ├── todo.graphql         # Todo schema definitions
│   │   ├── todo-queries.ts      # Todo query resolvers
│   │   └── todo-mutations.ts    # Todo mutation resolvers
│   ├── posts/
│   │   ├── post.graphql         # Post schema definitions
│   │   ├── post-queries.ts      # Post query resolvers
│   │   └── create-post.ts       # Post mutation resolvers
│   └── comments/
│       ├── comment.graphql      # Comment schema definitions
│       ├── comment-queries.ts   # Comment query resolvers
│       └── add-comment.ts       # Comment mutation resolvers
```

## Context

The GraphQL context includes:
- `event`: The H3 event object
- `request`: The original request object
- `storage`: Nitro storage instance

```ts
// Example resolver with full context usage
import { defineResolver } from 'nitro-graphql'

export default defineResolver({
  Query: {
    currentUser: async (_, __, { event, request, storage }) => {
      const token = getCookie(event, 'auth-token')
      const userAgent = getHeader(event, 'user-agent')

      if (!token) {
        throw new Error('Unauthorized')
      }

      const userId = await verifyToken(token)
      return await storage.getItem(`user:${userId}`)
    }
  }
})
```

## Configuration Options

```ts
interface NitroGraphQLYogaOptions {
  // GraphQL endpoint path
  endpoint?: string // default: '/api/graphql'

  // Enable/disable Apollo Sandbox
  playground?: boolean // default: true

  // CORS configuration
  cors?: boolean | {
    origin?: string | string[] | boolean
    credentials?: boolean
    methods?: string[]
  }

  // Cache headers configuration
  cacheHeaders?: {
    enabled?: boolean // default: true
    maxAge?: number // default: 604800 (1 week)
  }

  // Client type generation
  client?: {
    enabled?: boolean // default: false
    outputPath?: string // default: buildDir/types/graphql-client.generated.ts
    watchPatterns?: string[] // default: src/**/*.{graphql,gql} excluding server/graphql
    config?: {
      documentMode?: 'string' | 'graphQLTag'
      emitLegacyCommonJSImports?: boolean
      useTypeImports?: boolean
      enumsAsTypes?: boolean
    }
  }
}
```

## Development Features

### Hot Reload
The module watches for changes in your GraphQL files and automatically:
- Regenerates TypeScript types
- Reloads the GraphQL schema
- Updates resolvers

### Bundle Optimization
- Uses dynamic imports to prevent bundling large codegen dependencies
- Optimized chunk organization for better caching
- Minimal logging output with consistent `[graphql]` tagging

### Health Check
Access the health check endpoint at `/api/graphql/health` to verify your GraphQL server status.

## Advanced Usage

### Custom GraphQL Yoga Configuration

You can create a custom GraphQL Yoga configuration file that will be automatically merged with the default configuration. The module will look for this file **only in the `server/graphql/` directory**:

- `server/graphql/yoga.config.ts`

```ts
import { useCORS } from '@graphql-yoga/plugin-cors'
import { useResponseCache } from '@graphql-yoga/plugin-response-cache'
// server/graphql/yoga.config.ts
import { defineYogaConfig } from 'nitro-graphql'

export default defineYogaConfig({
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

  // Enhanced context with custom properties
  context: async ({ request }) => {
    const event = request.$$event

    return {
      event,
      request,
      storage: useStorage(),
      // Add custom context properties
      user: await authenticateUser(event),
      db: await connectDatabase(),
      startTime: Date.now(),
    }
  },

  // Custom error handling
  maskedErrors: {
    maskError: (error, message, isDev) => {
      if (error.message.startsWith('USER_')) {
        return error // Don't mask user-facing errors
      }
      return isDev ? error : new Error('Internal server error')
    },
  },

  // Additional yoga options
  // See: https://the-guild.dev/graphql/yoga-server/docs
})
```

**Configuration Merging**: Your custom config is merged with the default config, allowing you to override specific options while keeping defaults for others. The `schema` and `graphqlEndpoint` are always preserved from the module's configuration.

### Client Type Generation

Enable client type generation for your frontend queries:

```ts
// nitro.config.ts
export default defineNitroConfig({
  graphqlYoga: {
    client: {
      enabled: true,
      watchPatterns: [
        'client/**/*.graphql',
        'pages/**/*.vue',
        'components/**/*.vue'
      ]
    }
  }
})
```

### Custom Scalars

```ts
import { GraphQLScalarType } from 'graphql'
import { Kind } from 'graphql/language'
// server/graphql/scalars/DateTime.ts
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
// server/graphql/users/user-queries.ts
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
      }
      catch (error) {
        console.error('[graphql] Error fetching user:', error)
        throw error
      }
    }
  }
})
```

## Performance

### Bundle Size
The module is optimized for minimal bundle size:
- Development dependencies are excluded from production builds
- Uses Function constructor for dynamic imports to prevent bundling
- Efficient chunk organization

### Caching
- Built-in cache headers for Apollo Sandbox (1 week)
- Configurable cache settings
- Lazy schema initialization

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

## License

MIT
