# Apollo Federation Subgraph

This example demonstrates how to create an Apollo Federation subgraph using nitro-graphql. Federation allows you to compose multiple GraphQL services into a single unified graph, enabling a microservices architecture for your GraphQL API.

## Features Demonstrated

- Apollo Federation v2 subgraph setup
- Entity resolution with `@key` directive
- Type references across services
- Both Apollo Server and GraphQL Yoga support
- Auto-discovery of schemas and resolvers
- Federation-specific directives
- Subgraph configuration

## What is Apollo Federation?

Apollo Federation is a GraphQL architecture that allows you to:
- Split your GraphQL schema across multiple services (subgraphs)
- Compose these subgraphs into a unified supergraph
- Enable each service to own and manage specific parts of the schema
- Share types and data between services

## Project Structure

```
users-service/
├── server/
│   └── graphql/
│       ├── schema.graphql          # Federation schema with @key
│       ├── users.resolver.ts       # Resolvers with entity reference
│       ├── config.ts               # GraphQL config
│       └── context.ts              # Context definition
├── nitro.config.ts                 # Nitro configuration with federation
└── package.json
```

## Installation

```bash
# Create a new directory for your subgraph
mkdir users-service
cd users-service

# Initialize package.json
pnpm init

# Install dependencies
pnpm add nitro-graphql graphql h3 nitropack @apollo/server @apollo/subgraph
```

## Configuration

### package.json

```json
{
  "name": "users-service",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "nitro dev",
    "dev:apollo": "nitro dev --config nitro.config.apollo.ts",
    "dev:yoga": "nitro dev --config nitro.config.yoga.ts",
    "build": "nitro build",
    "preview": "node .output/server/index.mjs"
  },
  "dependencies": {
    "@apollo/server": "^5.0.0",
    "@apollo/subgraph": "^2.9.8",
    "graphql": "^16.11.0",
    "h3": "^2.0.1",
    "nitro-graphql": "^2.0.0-beta.1",
    "nitropack": "^3.0.1"
  }
}
```

### nitro.config.ts (Apollo Server)

```typescript
export default defineNitroConfig({
  modules: [
    'nitro-graphql',
  ],
  graphql: {
    // Use Apollo Server for federation support
    framework: 'apollo-server',
    federation: {
      enabled: true,
      serviceName: 'users-service',
      serviceVersion: '1.0.0',
      serviceUrl: 'http://localhost:3000/api/graphql',
    },
  },
})
```

### nitro.config.ts (GraphQL Yoga)

GraphQL Yoga also supports federation:

```typescript
export default defineNitroConfig({
  modules: [
    'nitro-graphql',
  ],
  graphql: {
    // GraphQL Yoga with federation
    framework: 'graphql-yoga',
    federation: {
      enabled: true,
      serviceName: 'users-service-yoga',
      serviceVersion: '1.0.0',
      serviceUrl: 'http://localhost:3000/api/graphql',
    },
  },
})
```

## GraphQL Schema with Federation

### server/graphql/schema.graphql

```graphql
# Federation v2 imports
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.5", import: ["@key"])

# User entity - can be referenced by other services
type User @key(fields: "id") {
  id: ID!
  email: String!
  name: String!
}

type Query {
  user(id: ID!): User
  users: [User!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
}

input CreateUserInput {
  email: String!
  name: String!
}
```

### Key Concepts

- `@key(fields: "id")`: Marks User as an entity that can be referenced by other services
- `extend schema @link`: Imports Federation v2 directives
- Entities can be resolved from references in other services

## Resolvers with Entity Resolution

### server/graphql/users.resolver.ts

```typescript
interface User {
  id: string
  email: string
  name: string
}

// Mock data for demo
const users: User[] = [
  { id: '1', email: 'john@example.com', name: 'John Doe' },
  { id: '2', email: 'jane@example.com', name: 'Jane Smith' },
  { id: '3', email: 'bob@example.com', name: 'Bob Johnson' },
]

// Standard queries
export const userQueries = defineQuery({
  user: (_, { id }: { id: string }) => {
    return users.find(user => user.id === id) || null
  },
  users: () => {
    return users
  },
})

// Standard mutations
export const userMutations = defineMutation({
  createUser: (_, { input }: { input: { email: string, name: string } }) => {
    const newUser: User = {
      id: String(users.length + 1),
      email: input.email,
      name: input.name,
    }
    users.push(newUser)
    return newUser
  },
})

// Federation: Entity resolver for User type
// This allows other services to resolve User entities by reference
export const userTypeResolver = defineType({
  User: {
    __resolveReference: (user: { id: string }) => {
      // Other services can reference a User by just its ID
      // This resolver fetches the full User data
      return users.find(u => u.id === user.id) || null
    },
  },
})
```

### Entity Resolution Explained

The `__resolveReference` resolver is called when another service references a User:

```graphql
# In another service (e.g., posts-service)
type Post {
  id: ID!
  title: String!
  author: User  # Reference to User entity from users-service
}
```

When querying posts, the gateway will:
1. Fetch posts from the posts-service
2. See that Post.author references a User entity
3. Call the users-service `__resolveReference` resolver with the User ID
4. Return the complete user data

## Context Definition

### server/graphql/context.ts

```typescript
declare module 'h3' {
  interface H3EventContext {
    event: H3Event
    storage: any
    // Add federation-specific context if needed
    userId?: string
    serviceName?: string
  }
}
```

## Running the Subgraph

```bash
# Development mode with Apollo Server
pnpm dev:apollo

# Development mode with GraphQL Yoga
pnpm dev:yoga

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The subgraph will be available at:
- Endpoint: `http://localhost:3000/api/graphql`
- Apollo Sandbox: Visit the endpoint in your browser

## Testing the Subgraph

### Standalone Queries

You can test the subgraph directly:

```graphql
# Get all users
query GetUsers {
  users {
    id
    email
    name
  }
}

# Get single user
query GetUser {
  user(id: "1") {
    id
    email
    name
  }
}

# Create user
mutation CreateUser {
  createUser(input: {
    email: "alice@example.com"
    name: "Alice Johnson"
  }) {
    id
    email
    name
  }
}
```

### Entity Resolution Test

Test the entity resolver directly:

```graphql
query EntityResolverTest {
  _entities(representations: [
    { __typename: "User", id: "1" }
  ]) {
    ... on User {
      id
      email
      name
    }
  }
}
```

## Setting Up Apollo Gateway

To compose multiple subgraphs, you need an Apollo Gateway or Apollo Router:

### Option 1: Apollo Gateway (Node.js)

```typescript
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway'
import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'users', url: 'http://localhost:3000/api/graphql' },
      { name: 'posts', url: 'http://localhost:3001/api/graphql' },
      // Add more subgraphs as needed
    ],
  }),
})

const server = new ApolloServer({
  gateway,
})

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
})

console.log(`Gateway ready at ${url}`)
```

### Option 2: Apollo Router (Rust-based, recommended for production)

```bash
# Install Apollo Router
curl -sSL https://router.apollo.dev/download/nix/latest | sh

# Create router configuration
cat > router.yaml << EOF
supergraph:
  introspection: true

subgraphs:
  users:
    routing_url: http://localhost:3000/api/graphql
  posts:
    routing_url: http://localhost:3001/api/graphql
EOF

# Run the router
./router --config router.yaml
```

## Creating a Second Subgraph (Posts Service)

Here's a simple posts service that references Users:

### posts-service/server/graphql/schema.graphql

```graphql
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.5", import: ["@key"])

# Reference to User entity from users-service
type User @key(fields: "id") {
  id: ID!
  posts: [Post!]!
}

type Post @key(fields: "id") {
  id: ID!
  title: String!
  content: String!
  authorId: ID!
  author: User
}

type Query {
  post(id: ID!): Post
  posts: [Post!]!
}
```

### posts-service/server/graphql/posts.resolver.ts

```typescript
interface Post {
  id: string
  title: string
  content: string
  authorId: string
}

const posts: Post[] = [
  { id: '1', title: 'Hello World', content: 'First post!', authorId: '1' },
  { id: '2', title: 'GraphQL is awesome', content: 'Federation rocks!', authorId: '2' },
]

export const postQueries = defineQuery({
  post: (_, { id }) => posts.find(p => p.id === id) || null,
  posts: () => posts,
})

// Resolve Post.author by returning a User reference
export const postTypeResolver = defineType({
  Post: {
    author: (post) => {
      // Return a reference to User entity
      // The gateway will call users-service to resolve it
      return { __typename: 'User', id: post.authorId }
    },
  },
})

// Extend User type to add posts field
export const userTypeResolver = defineType({
  User: {
    posts: (user) => {
      // Resolve posts for a user
      return posts.filter(p => p.authorId === user.id)
    },
  },
})
```

## Querying the Supergraph

Once you have the gateway running with both services, you can query across them:

```graphql
# Query that spans both services
query GetUserWithPosts {
  user(id: "1") {
    id
    name
    email
    posts {
      id
      title
      content
    }
  }
}

# Get posts with author details
query GetPostsWithAuthors {
  posts {
    id
    title
    author {
      id
      name
      email
    }
  }
}
```

## Benefits of Federation

1. **Service Autonomy**: Each team can own and deploy their service independently
2. **Type Sharing**: Services can reference and extend types from other services
3. **Unified API**: Clients see a single GraphQL schema
4. **Scalability**: Scale services independently based on load
5. **Team Organization**: Align services with team boundaries

## Best Practices

1. **Entity Design**: Use `@key` on types that other services need to reference
2. **Clear Boundaries**: Each service should own specific business domains
3. **Avoid Circular Dependencies**: Plan your entity relationships carefully
4. **Schema Documentation**: Document entities and their relationships
5. **Monitoring**: Monitor subgraph health and performance
6. **Versioning**: Use `serviceVersion` to track subgraph changes

## Deployment Considerations

### Subgraph Deployment

Each subgraph is an independent Nitro service:

```bash
# Build subgraph
pnpm build

# Deploy to your platform (Vercel, Netlify, AWS, etc.)
# Each subgraph gets its own URL
```

### Gateway Deployment

- **Apollo Router**: Recommended for production (Rust-based, high performance)
- **Apollo Gateway**: Node.js-based, easier to customize
- **Managed Federation**: Use Apollo Studio for schema composition and management

## Troubleshooting

### Schema Composition Errors

If the gateway can't compose your schemas:
- Ensure all `@key` fields exist on the entity
- Check for conflicting field definitions
- Validate federation directives are correct

### Entity Resolution Issues

If entities aren't resolving:
- Verify `__resolveReference` is implemented
- Check that the entity has a `@key` directive
- Ensure the reference includes the `__typename`

## Next Steps

- Add more subgraphs for different domains
- Implement authentication across services
- Add DataLoader for efficient batching
- Set up Apollo Studio for schema management
- Implement distributed tracing
- Add caching strategies

## Related Examples

- [Basic Nitro Server](./nitro-basic.md) - Start here if new to nitro-graphql
- [Full-stack Nuxt App](./nuxt-fullstack.md) - Client-side integration
- [External Services](./external-services.md) - Integrate third-party APIs

## Resources

- [Apollo Federation Docs](https://www.apollographql.com/docs/federation/)
- [Federation v2 Spec](https://www.apollographql.com/docs/federation/federation-spec/)
- [Apollo Router](https://www.apollographql.com/docs/router/)
- [nitro-graphql Federation Guide](https://github.com/your-repo/nitro-graphql/docs/federation.md)

## Playground Reference

This example is based on the [Federation Playground](https://github.com/your-repo/nitro-graphql/tree/main/playgrounds/federation) in the nitro-graphql repository.
