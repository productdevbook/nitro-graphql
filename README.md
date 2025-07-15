# Nitro GraphQL

<div align="center">

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

**A standalone Nitro module that integrates GraphQL servers into any Nitro application with automatic type generation, file watching, and seamless framework integration.**

[🚀 Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [🎮 Playground](#-playground) • [💬 Community](#-community--contributing)

</div>

---

> [!NOTE]
> This project is actively under development. We're always open to new ideas, different perspectives, and feature suggestions! If you have a suggestion, please first [open an issue](https://github.com/productdevbook/nitro-graphql/issues) to discuss it, then you can contribute with a PR.

## ✨ Features

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

## 🚀 Quick Start

### Step 1: Installation

Choose your GraphQL framework and install required dependencies:

**For GraphQL Yoga:**
```bash
# npm
npm install nitro-graphql graphql-yoga graphql

# pnpm (recommended)
pnpm add nitro-graphql graphql-yoga graphql

# yarn
yarn add nitro-graphql graphql-yoga graphql
```

**For Apollo Server:**
```bash
# npm
npm install nitro-graphql @apollo/server graphql

# pnpm (recommended)
pnpm add nitro-graphql @apollo/server graphql

# yarn
yarn add nitro-graphql @apollo/server graphql
```

### Step 2: Setup Your Project

<details>
<summary>🔧 <strong>For Standalone Nitro Projects</strong></summary>

1. **Update your `nitro.config.ts`:**
```ts
import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  modules: ['nitro-graphql'],
  graphql: {
    framework: 'graphql-yoga', // or 'apollo-server'
  },
})
```

2. **Create the GraphQL directory structure:**
```bash
mkdir -p server/graphql
```

</details>

<details>
<summary>🟢 <strong>For Nuxt.js Projects</strong></summary>

1. **Update your `nuxt.config.ts`:**
```ts
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

2. **Create the GraphQL directory structure:**
```bash
mkdir -p server/graphql
```

</details>

### Step 3: Create Your First Schema

Create your main schema file:

```graphql
# server/graphql/schema.graphql
scalar DateTime
scalar JSON

type Query {
  hello: String!
  greeting(name: String!): String!
}

type Mutation {
  _empty: String
}
```

### Step 4: Create Your First Resolver

Create a resolver for your queries:

```ts
// server/graphql/hello.resolver.ts
import { defineResolver } from 'nitro-graphql/utils/define'

export const helloResolver = defineResolver({
  Query: {
    hello: () => 'Hello from GraphQL!',
    greeting: (_, { name }) => `Hello, ${name}!`,
  },
})

// You can also export multiple resolvers from the same file
export const additionalResolver = defineResolver({
  Query: {
    // Additional query resolvers
  },
})
```

### Step 5: Start Your Server

```bash
# For Nitro
pnpm dev

# For Nuxt
pnpm dev
```

### Step 6: Test Your GraphQL API

🎉 **That's it!** Your GraphQL server is now running at:

- **GraphQL Endpoint**: `http://localhost:3000/api/graphql`
- **Apollo Sandbox**: `http://localhost:3000/api/graphql` (in browser)
- **Health Check**: `http://localhost:3000/api/graphql/health`

## 📖 Documentation

### Project Structure

The module uses a domain-driven file structure under `server/graphql/`:

```
server/
├── graphql/
│   ├── schema.graphql              # Main schema with scalars and base types
│   ├── hello.resolver.ts           # Global resolvers (use named exports)
│   ├── users/
│   │   ├── user.graphql           # User schema definitions
│   │   ├── user-queries.resolver.ts # User query resolvers (use named exports)
│   │   └── create-user.resolver.ts  # User mutation resolvers (use named exports)
│   ├── posts/
│   │   ├── post.graphql           # Post schema definitions
│   │   ├── post-queries.resolver.ts # Post query resolvers (use named exports)
│   │   └── create-post.resolver.ts  # Post mutation resolvers (use named exports)
│   └── config.ts                   # Optional GraphQL configuration
│   └── schema.ts                   # Changing Special Return types
```

> [!TIP]
> **New Named Export Pattern**: The module now supports named exports for GraphQL resolvers, allowing you to export multiple resolvers from a single file. This provides better organization and flexibility in structuring your resolver code.

### Building Your First Feature

Let's create a complete user management feature:

<details>
<summary>👤 <strong>Step 1: Define User Schema</strong></summary>

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

</details>

<details>
<summary>🔍 <strong>Step 2: Create Query Resolvers</strong></summary>

```ts
// server/graphql/users/user-queries.resolver.ts
import { defineQuery } from 'nitro-graphql/utils/define'

export const userQueries = defineQuery({
  users: async (_, __, { storage }) => {
    return await storage.getItem('users') || []
  },
  user: async (_, { id }, { storage }) => {
    const users = await storage.getItem('users') || []
    return users.find(user => user.id === id)
  }
})

// You can also split queries into separate named exports
export const additionalUserQueries = defineQuery({
  userCount: async (_, __, { storage }) => {
    const users = await storage.getItem('users') || []
    return users.length
  },
})
```

</details>

<details>
<summary>✏️ <strong>Step 3: Create Mutation Resolvers</strong></summary>

```ts
// server/graphql/users/create-user.resolver.ts
import { defineMutation } from 'nitro-graphql/utils/define'

export const createUserMutation = defineMutation({
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

// You can also export multiple mutations from the same file
export const updateUserMutation = defineMutation({
  updateUser: async (_, { id, input }, { storage }) => {
    const users = await storage.getItem('users') || []
    const userIndex = users.findIndex(user => user.id === id)
    if (userIndex === -1)
      throw new Error('User not found')

    users[userIndex] = { ...users[userIndex], ...input }
    await storage.setItem('users', users)
    return users[userIndex]
  }
})
```

</details>

<details>
<summary>🧪 <strong>Step 4: Test Your Feature</strong></summary>

Open Apollo Sandbox at `http://localhost:3000/api/graphql` and try:

```graphql
# Create a user
mutation {
  createUser(input: {
    name: "John Doe"
    email: "john@example.com"
  }) {
    id
    name
    email
    createdAt
  }
}

# Query users
query {
  users {
    id
    name
    email
  }
}
```

</details>

### Type Generation

The module automatically generates TypeScript types for you:

- **Server types**: `.nitro/types/nitro-graphql-server.d.ts`
- **Client types**: `.nitro/types/nitro-graphql-client.d.ts`
- **Auto-imports**: Available for `defineResolver` and other utilities

Your IDE will automatically provide type safety and autocomplete!

#### Using Generated Types

You can import and use the generated types in your code:

**Client-side types** (`#graphql/client`):
```ts
// Import generated types for queries, mutations, and operations
import type { GetUsersQuery, CreateUserInput } from '#graphql/client'

// Use in Vue components
const users = ref<GetUsersQuery['users']>([])

// Use in composables
export function useUsers() {
  const createUser = async (input: CreateUserInput) => {
    // Type-safe input
  }
}
```

**Server-side types** (`#graphql/server`):
```ts
// Import generated types and interfaces
import type { User, Post, CreateUserInput } from '#graphql/server'

// Use types in your server code
function validateUser(user: User): boolean {
  return user.email.includes('@')
}

// Use in data layer
async function getUserPosts(user: User): Promise<Post[]> {
  // user is fully typed with all fields
  return await db.posts.findMany({ where: { authorId: user.id } })
}

// Use input types for validation
function validateCreateUserInput(input: CreateUserInput): void {
  if (!input.email || !input.name) {
    throw new Error('Email and name are required')
  }
}
```

These imports provide full TypeScript support with autocompletion, type checking, and IntelliSense in your IDE.

> [!TIP]
> **Nitro Auto-Imports**: Thanks to Nitro's auto-import feature, you don't need to manually import `defineResolver`, `defineQuery`, `defineMutation`, and other utilities in your resolver files. They're available globally! However, if you prefer explicit imports, you can use:
> ```ts
> import { defineResolver } from 'nitro-graphql/utils/define'
> ```

### Configuration

<details>
<summary>⚙️ <strong>Runtime Configuration</strong></summary>

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
        graphql: '/api/graphql', // GraphQL endpoint
        healthCheck: '/api/graphql/health' // Health check endpoint
      },
      playground: true, // Enable Apollo Sandbox
    }
  }
})
```

</details>

<details>
<summary>🔧 <strong>Advanced Configuration</strong></summary>

```ts
// server/graphql/config.ts
import { defineGraphQLConfig } from 'nitro-graphql/utils/define'

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

</details>

## 🎮 Playground

Try out the examples:

- **Standalone Nitro**: [`playground/`](playground/)
- **Nuxt.js Integration**: [`playground-nuxt/`](playground-nuxt/)

Both examples include working GraphQL schemas, resolvers, and demonstrate the module's capabilities.

## 🔧 API Reference

### Core Utilities

> [!NOTE]
> **Auto-Import Available**: All utilities are automatically imported in your resolver files thanks to Nitro's auto-import feature. You can use them directly without import statements, or use explicit imports if you prefer:
> ```ts
> import { defineMutation, defineQuery, defineResolver } from 'nitro-graphql/utils/define'
> ```

> [!IMPORTANT]
> **Named Exports Required**: All GraphQL resolvers must now use named exports instead of default exports. This allows you to export multiple resolvers from a single file, providing better organization and flexibility. For example:
> ```ts
> // ✅ Correct - Named exports
> export const userQueries = defineQuery({ ... })
> export const userMutations = defineMutation({ ... })
>
> // ❌ Incorrect - Default exports (deprecated)
> export default defineQuery({ ... })
> ```

<details>
<summary><strong>defineResolver</strong> - Define complete resolvers</summary>

```ts
import { defineResolver } from 'nitro-graphql/utils/define'

export const mainResolver = defineResolver({
  Query: {
    // Query resolvers
  },
  Mutation: {
    // Mutation resolvers
  },
  // Custom type resolvers
})

// You can also export multiple resolvers from the same file
export const additionalResolver = defineResolver({
  Query: {
    // Additional query resolvers
  },
})
```

</details>

<details>
<summary><strong>defineQuery</strong> - Define only Query resolvers</summary>

```ts
import { defineQuery } from 'nitro-graphql/utils/define'

export const userQueries = defineQuery({
  users: async (_, __, { storage }) => {
    return await storage.getItem('users') || []
  },
  user: async (_, { id }, { storage }) => {
    const users = await storage.getItem('users') || []
    return users.find(user => user.id === id)
  }
})

// You can also split queries into separate named exports
export const userStatsQueries = defineQuery({
  userCount: async (_, __, { storage }) => {
    const users = await storage.getItem('users') || []
    return users.length
  },
})
```

</details>

<details>
<summary><strong>defineMutation</strong> - Define only Mutation resolvers</summary>

```ts
import { defineMutation } from 'nitro-graphql/utils/define'

export const userMutations = defineMutation({
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

// You can also export multiple mutations from the same file
export const userUpdateMutations = defineMutation({
  updateUser: async (_, { id, input }, { storage }) => {
    const users = await storage.getItem('users') || []
    const userIndex = users.findIndex(user => user.id === id)
    if (userIndex === -1)
      throw new Error('User not found')

    users[userIndex] = { ...users[userIndex], ...input }
    await storage.setItem('users', users)
    return users[userIndex]
  }
})
```

</details>

<details>
<summary><strong>defineSubscription</strong> - Define Subscription resolvers</summary>

```ts
import { defineSubscription } from 'nitro-graphql/utils/define'

export const userSubscriptions = defineSubscription({
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

// You can also export multiple subscriptions from the same file
export const notificationSubscriptions = defineSubscription({
  notificationAdded: {
    subscribe: () => pubsub.asyncIterator('NOTIFICATION_ADDED'),
  },
})
```

</details>

<details>
<summary><strong>defineType</strong> - Define custom type resolvers</summary>

```ts
import { defineType } from 'nitro-graphql/utils/define'

export const userTypes = defineType({
  User: {
    posts: async (parent, _, { storage }) => {
      const posts = await storage.getItem('posts') || []
      return posts.filter(post => post.authorId === parent.id)
    },
    fullName: parent => `${parent.firstName} ${parent.lastName}`,
  },
})

// You can also export multiple type resolvers from the same file
export const postTypes = defineType({
  Post: {
    author: async (parent, _, { storage }) => {
      const users = await storage.getItem('users') || []
      return users.find(user => user.id === parent.authorId)
    },
  },
})
```

</details>

<details>
<summary><strong>defineSchema</strong> - Define custom schema with validation</summary>

You can override schema types if needed. StandardSchema supported — Zod, Valibot, anything works:

```ts
# server/graphql/schema.ts
import { defineSchema } from 'nitro-graphql/utils/define'
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

**With Drizzle Schema:**
```ts
import { defineSchema } from 'nitro-graphql/utils/define'
import { z } from 'zod'
import { userSchema } from './drizzle/user'

export default defineSchema({
  Todo: z.object({
    id: z.string(),
    title: z.string(),
  }),
  User: userSchema, // Import from Drizzle schema
})
```

</details>

## 🚨 Troubleshooting

<details>
<summary><strong>Common Issues</strong></summary>

### GraphQL endpoint returns 404

**Solution**: Make sure you have:
1. Added `nitro-graphql` to your modules
2. Set the `graphql.framework` option
3. Created at least one schema file

### Types not generating

**Solution**:
1. Restart your dev server
2. Check that your schema files end with `.graphql`
3. Verify your resolver files end with `.resolver.ts`

### Hot reload not working

**Solution**:
1. Make sure you're in development mode
2. Check file naming conventions
3. Restart the dev server

### Import errors with utilities

**Solution**:
```ts
// ❌ Incorrect import path
import { defineResolver } from 'nitro-graphql'

// ✅ Correct import path
import { defineResolver } from 'nitro-graphql/utils/define'
```

### Export pattern errors

**Solution**:
```ts
// ❌ Incorrect - Default exports (deprecated)
export default defineResolver({ ... })

// ✅ Correct - Named exports
export const myResolver = defineResolver({ ... })
export const anotherResolver = defineResolver({ ... })
```

</details>

## 🌟 Framework Support

<details>
<summary><strong>GraphQL Yoga</strong></summary>

```ts
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
  },
})
```

</details>

<details>
<summary><strong>Apollo Server</strong></summary>

```ts
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'apollo-server',
  },
})
```

</details>

## 🔥 Advanced Features

<details>
<summary><strong>Custom Scalars</strong></summary>

```ts
// server/graphql/scalars/DateTime.resolver.ts
import { GraphQLScalarType } from 'graphql'
import { Kind } from 'graphql/language'
import { defineResolver } from 'nitro-graphql/utils/define'

export const dateTimeScalar = defineResolver({
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

// You can also export multiple scalars from the same file
export const jsonScalar = defineResolver({
  JSON: new GraphQLScalarType({
    name: 'JSON',
    serialize: value => value,
    parseValue: value => value,
    parseLiteral: (ast) => {
      if (ast.kind === Kind.STRING) {
        return JSON.parse(ast.value)
      }
      return null
    }
  })
})
```

</details>

<details>
<summary><strong>Error Handling</strong></summary>

```ts
// server/graphql/users/user-queries.resolver.ts
import { defineQuery } from 'nitro-graphql/utils/define'

export const userQueries = defineQuery({
  user: async (_, { id }, { storage }) => {
    try {
      const user = await storage.getItem(`user:${id}`)
      if (!user) {
        throw new Error(`User with id ${id} not found`)
      }
      return user
    }
    catch (error) {
      console.error('Error fetching user:', error)
      throw error
    }
  }
})

// You can also export additional error handling queries
export const safeUserQueries = defineQuery({
  userSafe: async (_, { id }, { storage }) => {
    try {
      const user = await storage.getItem(`user:${id}`)
      return user || null // Return null instead of throwing
    }
    catch (error) {
      console.error('Error fetching user:', error)
      return null
    }
  }
})
```

</details>

<details>
<summary><strong>Nuxt Integration</strong></summary>

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

### Client-Side Usage

The module automatically generates a GraphQL SDK and provides type-safe client access for frontend usage.

<details>
<summary>📁 <strong>GraphQL File Structure</strong></summary>

Create your GraphQL queries and mutations in the `app/graphql/` directory:

```
app/
├── graphql/
│   ├── queries.graphql         # GraphQL queries
│   ├── mutations.graphql       # GraphQL mutations
│   └── subscriptions.graphql   # GraphQL subscriptions (optional)
```

</details>

<details>
<summary>🔥 <strong>Creating GraphQL Files</strong></summary>

**Query File Example:**
```graphql
# app/graphql/queries.graphql
query GetUsers {
  users {
    id
    name
    email
    createdAt
  }
}

query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    createdAt
  }
}
```

**Mutation File Example:**
```graphql
# app/graphql/mutations.graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
    createdAt
  }
}

mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    name
    email
    createdAt
  }
}
```

</details>

<details>
<summary>⚡ <strong>Using the Generated SDK</strong></summary>

The module automatically generates a type-safe SDK based on your GraphQL files:

```ts
// The SDK is automatically generated and available as an import
import { createGraphQLClient } from '#graphql/client'

// Create a client instance
const client = createGraphQLClient({
  endpoint: '/api/graphql',
  headers: {
    Authorization: 'Bearer your-token-here'
  }
})

// Use the generated methods with full type safety
const getUsersData = await client.GetUsers()
console.log(getUsersData.users) // Fully typed response

const newUser = await client.CreateUser({
  input: {
    name: 'John Doe',
    email: 'john@example.com'
  }
})
console.log(newUser.createUser) // Fully typed response
```

</details>

<details>
<summary>🎯 <strong>Basic Usage Examples</strong></summary>

**Fetching Data:**
```ts
// Import the generated client
import { createGraphQLClient } from '#graphql/client'

const client = createGraphQLClient()

// Query users
const { users } = await client.GetUsers()
console.log(users) // Array of User objects with full typing

// Query specific user
const { user } = await client.GetUser({ id: '123' })
console.log(user) // User object or null
```

**Creating Data:**
```ts
// Create a new user
const { createUser } = await client.CreateUser({
  input: {
    name: 'Jane Doe',
    email: 'jane@example.com'
  }
})
console.log(createUser) // Newly created user with full typing
```

**Error Handling:**
```ts
try {
  const { users } = await client.GetUsers()
  console.log(users)
}
catch (error) {
  console.error('GraphQL Error:', error)
  // Handle GraphQL errors appropriately
}
```

</details>

<details>
<summary>🔧 <strong>Client Configuration</strong></summary>

```ts
import { createGraphQLClient } from '#graphql/client'

// Basic configuration
const client = createGraphQLClient({
  endpoint: '/api/graphql',
  headers: {
    'Authorization': 'Bearer your-token',
    'X-Client-Version': '1.0.0'
  },
  timeout: 10000
})

// Advanced configuration with dynamic headers
const client = createGraphQLClient({
  endpoint: '/api/graphql',
  headers: async () => {
    const token = await getAuthToken()
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Request-ID': crypto.randomUUID()
    }
  },
  retry: 3,
  timeout: 30000
})
```

</details>

</details>

## 🛠️ Development

### Scripts

- `pnpm build` - Build the module
- `pnpm dev` - Watch mode with automatic rebuilding
- `pnpm lint` - ESLint with auto-fix
- `pnpm playground` - Run the Nitro playground example
- `pnpm release` - Build, version bump, and publish

### Requirements

- Node.js 20.x or later
- pnpm (required package manager)

## 💬 Community & Contributing

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

## 📋 Community TODOs

Help us improve nitro-graphql! Pick any item and contribute:

### 🚀 Framework Examples
- [ ] Nitro-compatible framework integrations
- [ ] Nuxt + Pinia Colada example
- [ ] StackBlitz playground demos

### 🧹 Code Quality
- [ ] Performance benchmarks
- [ ] Bundle size optimization
- [ ] Testing utilities
- [ ] Error handling patterns

### 📚 Documentation  
- [ ] Video tutorials
- [ ] Migration guides
- [ ] Best practices guide

### 🔧 Developer Tools
- [ ] VS Code extension
- [ ] CLI tools
- [ ] Debug utilities

### 🌐 Integrations
- [ ] Database adapters (Prisma, Drizzle)
- [ ] Cache strategies
- [ ] Deployment guides

> [!NOTE]
> Have other ideas? Open an issue to discuss!

## 🛠️ VS Code Extensions

For the best development experience with GraphQL, install these recommended VS Code extensions:

- **[GraphQL: Language Feature Support](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql)** - Provides GraphQL language features like autocompletion, go-to definition, and schema validation
- **[GraphQL: Syntax Highlighting](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql-syntax)** - Adds syntax highlighting for GraphQL queries, mutations, subscriptions, and schema files

These extensions will enable:
- 🎨 Syntax highlighting for `.graphql` files
- 📝 IntelliSense and autocompletion based on your schema
- ✅ Real-time validation of GraphQL queries
- 🔍 Go-to definition for types and fields
- 💡 Hover information for GraphQL elements

---

### 🌟 Thank You

Thank you for using and developing this project. Every contribution makes the GraphQL ecosystem stronger!

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/productdevbook/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/productdevbook/static/sponsors.svg?t=1721043966'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © 2023 [productdevbook](https://github.com/productdevbook)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/nitro-graphql?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/nitro-graphql
[npm-downloads-src]: https://img.shields.io/npm/dm/nitro-graphql?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/nitro-graphql
[bundle-src]: https://deno.bundlejs.com/badge?q=nitro-graphql@0.0.4
[bundle-href]: https://deno.bundlejs.com/badge?q=nitro-graphql@0.0.4
[license-src]: https://img.shields.io/github/license/productdevbook/nitro-graphql.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/productdevbook/nitro-graphql/blob/main/LICENSE
[jsdocs-href]: https://www.jsdocs.io/package/nitro-graphql
