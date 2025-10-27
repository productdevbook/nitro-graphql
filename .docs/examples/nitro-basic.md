# Basic Nitro Server with GraphQL

This example demonstrates a basic Nitro server with GraphQL integration, including auto-discovery of schemas and resolvers, type generation, and custom directives.

## Features Demonstrated

- Auto-discovery of GraphQL schemas and resolvers
- Type-safe resolver definitions with TypeScript
- Custom GraphQL directives (auth, validation, caching, transformations)
- In-memory data storage
- Query and Mutation operations
- Scalar types (DateTime, JSON)

## Project Structure

```
my-nitro-app/
├── server/
│   ├── graphql/
│   │   ├── schema.graphql          # Main schema definition
│   │   ├── context.ts              # H3 context augmentation
│   │   ├── config.ts               # GraphQL server configuration
│   │   ├── data/
│   │   │   └── index.ts            # Mock database
│   │   ├── users/
│   │   │   ├── user.graphql        # User schema
│   │   │   ├── user-queries.resolver.ts
│   │   │   └── create-user.resolver.ts
│   │   └── hello.resolver.ts       # Simple hello queries
│   └── routes/
│       └── index.ts                # API routes (optional)
├── nitro.config.ts                 # Nitro configuration
└── package.json
```

## Installation

```bash
# Create a new directory
mkdir my-nitro-app
cd my-nitro-app

# Initialize package.json
pnpm init

# Install dependencies
pnpm add nitro-graphql graphql h3 nitropack
```

## Configuration

### package.json

```json
{
  "name": "my-nitro-app",
  "type": "module",
  "scripts": {
    "dev": "nitro dev",
    "build": "nitro build",
    "preview": "node .output/server/index.mjs"
  },
  "dependencies": {
    "graphql": "^16.11.0",
    "h3": "^2.0.1",
    "nitro-graphql": "^2.0.0-beta.1",
    "nitropack": "^3.0.1"
  }
}
```

### nitro.config.ts

```typescript
import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  srcDir: 'server',
  modules: ['nitro-graphql'],
  compatibilityDate: '2025-07-01',
  graphql: {
    framework: 'graphql-yoga',
  },
  esbuild: {
    options: {
      target: 'esnext',
    },
  },
})
```

## GraphQL Schema

### server/graphql/schema.graphql

```graphql
scalar DateTime
scalar JSON

type Query {
  hello: String!
  greeting(name: String!): String!
  # Protected field that requires authentication
  profile: User @auth
  # Admin-only field
  adminData: String @auth(requires: "ADMIN")
}

type Mutation {
  createUser(
    name: String! @validate(minLength: 2, maxLength: 50)
    email: String! @validate(pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")
    age: Int! @validate(min: 18, max: 100)
  ): User
}
```

### server/graphql/users/user.graphql

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  bio: String
  phone: String
  age: Int
  role: String!
  isActive: Boolean!
  createdAt: DateTime!
}

input CreateUserInput {
  name: String!
  email: String!
}

input UpdateUserInput {
  name: String
  email: String
}

extend type Query {
  users: [User!]!
  user(id: ID!): User
}

extend type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}
```

## Context Definition

### server/graphql/context.ts

```typescript
declare module 'h3' {
  interface H3EventContext {
    event: H3Event
    storage: any
    user?: {
      id: string
      name: string
      email: string
      role: 'USER' | 'ADMIN'
    }
  }
}
```

## Resolvers

### server/graphql/hello.resolver.ts

```typescript
export const helloQueries = defineResolver({
  Query: {
    hello: () => 'Hello from auto-discovered resolver!',

    greeting: (_parent, { name }) => `Hello, ${name}!`,

    profile: (_parent, _args, context) => {
      // This will only execute if the user passes the @auth directive check
      return {
        id: '1',
        name: context.user?.name || 'Test User',
        email: context.user?.email || 'test@example.com',
        role: context.user?.role || 'USER',
        bio: 'This is a test bio',
        phone: '+1234567890',
        age: 25,
      }
    },

    adminData: () => {
      // This will only execute if the user has ADMIN role
      return 'Secret admin data'
    },
  },
})
```

### server/graphql/users/user-queries.resolver.ts

```typescript
import { users } from '../data'

export const userQueries = defineResolver({
  Query: {
    users: () => {
      console.log('[GraphQL] Users query called')
      return users
    },

    user: (_parent, { id }) => {
      console.log('[GraphQL] User query called with id:', id)
      const user = users.find(user => user.id === id) || null
      return user
    },
  },
})
```

### server/graphql/users/create-user.resolver.ts

```typescript
import { generateId, users } from '../data'

export const createUserMutation = defineResolver({
  Mutation: {
    createUser: (_parent, { input }) => {
      const { name, email } = input

      const newUser = {
        id: generateId(),
        name,
        email,
        bio: null,
        phone: null,
        age: null,
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
      }

      users.push(newUser)
      console.log('[GraphQL] New user created:', newUser)

      return newUser
    },
  },
})

export const updateUserMutation = defineResolver({
  Mutation: {
    updateUser: (_parent, { id, input }) => {
      const userIndex = users.findIndex(user => user.id === id)

      if (userIndex === -1) {
        throw new Error(`User with id ${id} not found`)
      }

      const updatedUser = {
        ...users[userIndex],
        ...input,
      }

      users[userIndex] = updatedUser
      console.log('[GraphQL] User updated:', updatedUser)

      return updatedUser
    },
  },
})

export const deleteUserMutation = defineResolver({
  Mutation: {
    deleteUser: (_parent, { id }) => {
      const userIndex = users.findIndex(user => user.id === id)

      if (userIndex === -1) {
        throw new Error(`User with id ${id} not found`)
      }

      users.splice(userIndex, 1)
      console.log('[GraphQL] User deleted:', id)

      return true
    },
  },
})
```

## Mock Database

### server/graphql/data/index.ts

```typescript
interface User {
  id: string
  name: string
  email: string
  bio: string | null
  phone: string | null
  age: number | null
  role: string
  isActive: boolean
  createdAt: Date
}

// Initial data
export const users: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    bio: null,
    phone: null,
    age: null,
    role: 'USER',
    isActive: true,
    createdAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    bio: null,
    phone: null,
    age: null,
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date('2024-01-02')
  },
]

// Utility functions
export const generateId = () => Date.now().toString()

export function findById<T extends { id: string }>(items: T[], id: string) {
  return items.find(item => item.id === id)
}

export function removeById<T extends { id: string }>(items: T[], id: string) {
  return items.filter(item => item.id !== id)
}
```

## Running the Server

```bash
# Development mode (with hot-reload)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The GraphQL endpoint will be available at:
- Development: `http://localhost:3000/api/graphql`
- Production: `http://localhost:3000/api/graphql` (or your configured port)

## Testing with GraphQL Playground

Visit `http://localhost:3000/api/graphql` in your browser to access the GraphiQL interface.

### Example Queries

```graphql
# Get all users
query GetUsers {
  users {
    id
    name
    email
    role
    createdAt
  }
}

# Get single user
query GetUser {
  user(id: "1") {
    id
    name
    email
  }
}

# Hello query
query SayHello {
  hello
  greeting(name: "World")
}
```

### Example Mutations

```graphql
# Create a new user
mutation CreateUser {
  createUser(input: {
    name: "Alice Johnson"
    email: "alice@example.com"
  }) {
    id
    name
    email
    createdAt
  }
}

# Update user
mutation UpdateUser {
  updateUser(id: "1", input: {
    name: "John Updated"
  }) {
    id
    name
    email
  }
}

# Delete user
mutation DeleteUser {
  deleteUser(id: "1")
}
```

## Type Safety

Once the server is running, TypeScript types will be auto-generated in `.nitro/types/nitro-graphql-server.d.ts`. You can use these types in your resolvers:

```typescript
import type { MutationResolvers, QueryResolvers } from '#graphql/server'

export const userQueries: QueryResolvers = {
  users: () => {
    // Fully typed!
    return users
  },
  user: (_parent, { id }) => {
    // id is typed as string
    return users.find(user => user.id === id) || null
  },
}
```

## Key Concepts

1. **Auto-Discovery**: Any `.graphql` file in `server/graphql/` is automatically discovered and merged into the schema
2. **Named Exports**: Resolver files must use named exports (not default exports)
3. **Resolver Utilities**: `defineResolver()`, `defineQuery()`, `defineMutation()` are auto-imported
4. **Context Access**: Access H3 event context in resolvers via the third parameter
5. **Type Generation**: Server types are automatically generated based on your GraphQL schema

## Next Steps

- Add custom directives (see playground for examples: auth, validation, caching)
- Integrate with a real database (Drizzle, Prisma, etc.)
- Add authentication middleware
- Implement subscriptions for real-time updates
- Add file uploads with multipart support

## Related Examples

- [Full-stack Nuxt App](./nuxt-fullstack.md) - Complete Nuxt application with client-side GraphQL
- [Apollo Federation](./federation-subgraph.md) - Federated GraphQL services
- [External Services](./external-services.md) - Integrate with external GraphQL APIs

## Playground Reference

This example is based on the [Nitro Playground](https://github.com/your-repo/nitro-graphql/tree/main/playgrounds/nitro) in the nitro-graphql repository.
