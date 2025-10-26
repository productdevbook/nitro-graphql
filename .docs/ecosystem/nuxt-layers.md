# Nuxt Layers

Nitro GraphQL provides full support for Nuxt layers, allowing you to share GraphQL schemas, resolvers, and queries across multiple projects or within a monorepo structure.

## What are Nuxt Layers?

Nuxt layers allow you to extend from another Nuxt project, inheriting its configuration, components, composables, and now with Nitro GraphQL - its GraphQL schemas and resolvers.

## How It Works

When you extend a Nuxt layer, Nitro GraphQL automatically:
1. Discovers all GraphQL schemas in the layer's `server/graphql/` directory
2. Discovers all resolvers in the layer's `server/graphql/` directory
3. Discovers client queries in the layer's `app/graphql/` directory
4. Merges everything with your main app's GraphQL code
5. Generates types that include all layer schemas

## Basic Setup

### Creating a Base Layer

First, create a layer with shared GraphQL code:

```
my-base-layer/
├── nuxt.config.ts
├── server/
│   └── graphql/
│       ├── schema.graphql
│       └── posts.resolver.ts
└── app/
    └── graphql/
        └── posts/
            └── queries.graphql
```

```ts
// my-base-layer/nuxt.config.ts
export default defineNuxtConfig({
  // Layer configuration
})
```

```graphql
# my-base-layer/server/graphql/schema.graphql
type Post {
  id: ID!
  title: String!
  content: String!
  author: String!
}

type Query {
  posts: [Post!]!
  post(id: ID!): Post
}
```

```ts
// my-base-layer/server/graphql/posts.resolver.ts
const posts = [
  { id: '1', title: 'Hello', content: 'World', author: 'Alice' },
  { id: '2', title: 'GraphQL', content: 'Rocks', author: 'Bob' },
]

export const postQueries = defineQuery({
  posts: () => posts,
  post: (_, { id }) => posts.find(p => p.id === id) || null,
})
```

### Using the Layer

In your main app, extend from the layer:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['./layers/my-base-layer'],

  modules: ['nitro-graphql/nuxt'],

  nitro: {
    graphql: {
      framework: 'graphql-yoga',
    },
  },
})
```

Now add your app-specific GraphQL code:

```
your-nuxt-app/
├── layers/
│   └── my-base-layer/         # Base layer with posts
│       └── server/
│           └── graphql/
│               ├── schema.graphql
│               └── posts.resolver.ts
├── server/
│   └── graphql/
│       ├── schema.graphql     # Your app schema
│       └── users.resolver.ts  # Your app resolvers
└── nuxt.config.ts
```

```graphql
# your-nuxt-app/server/graphql/schema.graphql
type User {
  id: ID!
  name: String!
  email: String!
}

type Query {
  users: [User!]!
  user(id: ID!): User
}
```

```ts
// your-nuxt-app/server/graphql/users.resolver.ts
export const userQueries = defineQuery({
  users: () => [
    { id: '1', name: 'Alice', email: 'alice@example.com' },
  ],
  user: (_, { id }) => ({ id, name: 'Alice', email: 'alice@example.com' }),
})
```

### Result

Both schemas and resolvers are automatically merged:

```graphql
# Merged schema available at /api/graphql
type Post {
  id: ID!
  title: String!
  content: String!
  author: String!
}

type User {
  id: ID!
  name: String!
  email: String!
}

type Query {
  # From layer
  posts: [Post!]!
  post(id: ID!): Post

  # From app
  users: [User!]!
  user(id: ID!): User
}
```

## Multi-Layer Setup

You can extend multiple layers:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    './layers/auth-layer', // Authentication
    './layers/blog-layer', // Blog posts
    './layers/comments-layer', // Comments
  ],

  modules: ['nitro-graphql/nuxt'],

  nitro: {
    graphql: {
      framework: 'graphql-yoga',
    },
  },
})
```

## Layer Discovery

Nitro GraphQL automatically scans all layers and collects:

### Server-Side
- `server/graphql/**/*.graphql` - Schema files
- `server/graphql/**/*.resolver.ts` - Resolver files
- `server/graphql/**/*.directive.ts` - Custom directives

### Client-Side
- `app/graphql/**/*.graphql` - Query/mutation documents

The module uses Nuxt's `getLayerDirectories()` utility to discover all layers in your project.

## Practical Examples

### Example 1: Authentication Layer

Create a reusable authentication layer:

```
layers/auth-layer/
├── server/
│   └── graphql/
│       ├── schema.graphql
│       ├── auth.resolver.ts
│       └── context.ts
└── app/
    └── graphql/
        └── auth/
            ├── login.graphql
            └── me.graphql
```

```graphql
# layers/auth-layer/server/graphql/schema.graphql
type User {
  id: ID!
  email: String!
  role: String!
}

input LoginInput {
  email: String!
  password: String!
}

type AuthPayload {
  token: String!
  user: User!
}

type Query {
  me: User
}

type Mutation {
  login(input: LoginInput!): AuthPayload!
  logout: Boolean!
}
```

```ts
// layers/auth-layer/server/graphql/auth.resolver.ts
export const authQueries = defineQuery({
  me: async (_, __, context) => {
    if (!context.user) {
      throw new Error('Not authenticated')
    }
    return context.user
  },
})

export const authMutations = defineMutation({
  login: async (_, { input }) => {
    // Your login logic
    const user = { id: '1', email: input.email, role: 'user' }
    const token = 'jwt-token-here'
    return { token, user }
  },
  logout: async () => {
    return true
  },
})
```

```graphql
# layers/auth-layer/app/graphql/auth/login.graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    token
    user {
      id
      email
      role
    }
  }
}
```

```graphql
# layers/auth-layer/app/graphql/auth/me.graphql
query GetMe {
  me {
    id
    email
    role
  }
}
```

Use in any app:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['./layers/auth-layer'],
  modules: ['nitro-graphql/nuxt'],
  nitro: {
    graphql: { framework: 'graphql-yoga' },
  },
})
```

```vue
<!-- app/pages/login.vue -->
<script setup lang="ts">
const { Login } = useGraphql()

async function handleLogin(email: string, password: string) {
  const result = await Login({ input: { email, password } })
  console.log('Logged in:', result.login.user)
}
</script>
```

### Example 2: Content Management Layer

Create a CMS layer:

```
layers/cms-layer/
├── server/
│   └── graphql/
│       ├── schema.graphql
│       └── content.resolver.ts
└── app/
    └── graphql/
        └── content/
            ├── pages.graphql
            └── articles.graphql
```

```graphql
# layers/cms-layer/server/graphql/schema.graphql
interface Content {
  id: ID!
  title: String!
  slug: String!
  createdAt: String!
  updatedAt: String!
}

type Page implements Content {
  id: ID!
  title: String!
  slug: String!
  body: String!
  createdAt: String!
  updatedAt: String!
}

type Article implements Content {
  id: ID!
  title: String!
  slug: String!
  excerpt: String!
  body: String!
  author: String!
  tags: [String!]!
  createdAt: String!
  updatedAt: String!
}

type Query {
  pages: [Page!]!
  page(slug: String!): Page
  articles: [Article!]!
  article(slug: String!): Article
}
```

```ts
// layers/cms-layer/server/graphql/content.resolver.ts
export const contentQueries = defineQuery({
  pages: async () => {
    // Fetch from database
    return []
  },
  page: async (_, { slug }) => {
    // Fetch single page
    return null
  },
  articles: async () => {
    return []
  },
  article: async (_, { slug }) => {
    return null
  },
})
```

### Example 3: Monorepo with Shared Types

Perfect for monorepos where multiple apps share GraphQL schemas:

```
monorepo/
├── layers/
│   └── shared-graphql/
│       └── server/
│           └── graphql/
│               └── schema.graphql     # Shared types
├── apps/
│   ├── admin-app/
│   │   ├── nuxt.config.ts
│   │   └── server/
│   │       └── graphql/
│   │           └── admin.resolver.ts
│   └── public-app/
│       ├── nuxt.config.ts
│       └── server/
│           └── graphql/
│               └── public.resolver.ts
└── package.json
```

```graphql
# layers/shared-graphql/server/graphql/schema.graphql
# Shared types used by all apps
type User {
  id: ID!
  name: String!
  email: String!
}

type Post {
  id: ID!
  title: String!
  author: User!
}
```

Both apps extend the shared layer:

```ts
// apps/admin-app/nuxt.config.ts
export default defineNuxtConfig({
  extends: ['../../layers/shared-graphql'],
  modules: ['nitro-graphql/nuxt'],
  nitro: {
    graphql: { framework: 'graphql-yoga' },
  },
})
```

```ts
// apps/public-app/nuxt.config.ts
export default defineNuxtConfig({
  extends: ['../../layers/shared-graphql'],
  modules: ['nitro-graphql/nuxt'],
  nitro: {
    graphql: { framework: 'graphql-yoga' },
  },
})
```

## Layer Overrides

Child apps can override layer resolvers:

```ts
// Layer resolver
// layers/base-layer/server/graphql/posts.resolver.ts
export const postQueries = defineQuery({
  posts: () => ['post1', 'post2'], // Simple implementation
})
```

```ts
// App override
// server/graphql/posts.resolver.ts
export const postQueries = defineQuery({
  posts: async () => {
    // Override with database implementation
    return await db.posts.findMany()
  },
})
```

::: tip Merge Behavior
When multiple layers or the app define the same resolver name, the last one wins (app > layers in order).
:::

## Schema Extension

Layers can extend types from other layers using GraphQL's `extend` syntax:

```graphql
# Layer 1: Base schema
type User {
  id: ID!
  email: String!
}
```

```graphql
# Layer 2: Extend User type
extend type User {
  profile: Profile
}

type Profile {
  avatar: String
  bio: String
}
```

```graphql
# App: Extend User type again
extend type User {
  posts: [Post!]!
}
```

All extensions are merged into a single schema.

## Client Queries in Layers

Client queries from layers are automatically discovered:

```
layers/base-layer/
└── app/
    └── graphql/
        └── users/
            └── queries.graphql
```

```graphql
# layers/base-layer/app/graphql/users/queries.graphql
query GetUsers {
  users {
    id
    name
  }
}
```

Use in any app that extends the layer:

```vue
<script setup lang="ts">
// GetUsers is available even though it's defined in a layer
const { GetUsers } = useGraphql()
const { data } = await useAsyncData('users', () => GetUsers())
</script>
```

## Type Generation with Layers

Generated types include all layer schemas:

```ts
// .nuxt/types/nitro-graphql-server.d.ts
// Includes types from all layers + app

declare module '#graphql/server' {
  // From base-layer
  export interface Post { ... }

  // From app
  export interface User { ... }

  // Merged resolvers
  export interface Query {
    posts: Post[]
    users: User[]
  }
}
```

## Debugging Layer Discovery

Use the debug dashboard to verify layer discovery:

```bash
pnpm dev
```

Visit `http://localhost:3000/_nitro/graphql/debug` to see:
- All discovered layers
- Schemas from each layer
- Resolvers from each layer
- Merged schema

## Best Practices

### 1. Layer Naming Conventions

Use clear, descriptive names:
```
layers/
├── auth-layer/
├── blog-layer/
├── comments-layer/
└── shared-types/
```

### 2. Avoid Type Conflicts

Each layer should define unique types or use `extend type` syntax:

```graphql
# ❌ Don't redefine types
type User {
  id: ID!
  name: String!
}

# ✅ Extend existing types
extend type User {
  profile: Profile
}
```

### 3. Document Layer Dependencies

```ts
// layers/blog-layer/nuxt.config.ts
/**
 * Blog Layer
 *
 * Dependencies:
 * - auth-layer: Uses User type for author
 * - comments-layer: Extends Post with comments
 */
export default defineNuxtConfig({
  // ...
})
```

### 4. Test Layers Independently

Each layer should be testable on its own:

```
layers/auth-layer/
├── playground/          # Test app for layer
│   ├── nuxt.config.ts
│   └── app/
└── server/
    └── graphql/
```

### 5. Version Your Layers

For shared layers across projects:

```json
// package.json
{
  "name": "@myorg/auth-layer",
  "version": "1.0.0"
}
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@myorg/auth-layer'],
})
```

## Advanced: Conditional Layer Loading

Load layers conditionally based on environment:

```ts
// nuxt.config.ts
const layers = ['./layers/core']

if (process.env.ENABLE_BLOG === 'true') {
  layers.push('./layers/blog')
}

if (process.env.ENABLE_COMMENTS === 'true') {
  layers.push('./layers/comments')
}

export default defineNuxtConfig({
  extends: layers,
  modules: ['nitro-graphql/nuxt'],
})
```

## Troubleshooting

### Layer Schemas Not Discovered

**Problem**: Layer GraphQL files aren't being loaded

**Solution**:
1. Verify layer structure matches Nuxt conventions
2. Check that `extends` is configured in `nuxt.config.ts`
3. Restart dev server after adding new layers
4. Visit `/_nitro/graphql/debug` to see discovered layers

### Duplicate Type Definitions

**Problem**: Error about duplicate type definitions

**Solution**:
```graphql
# Instead of redefining
type User { ... }

# Use extend syntax
extend type User { ... }
```

### Layer Resolvers Not Working

**Problem**: Resolvers from layers aren't being called

**Solution**:
1. Verify resolver files end with `.resolver.ts`
2. Check that resolvers use `defineQuery`, `defineMutation`, etc.
3. Ensure resolvers are exported with named exports
4. Check debug dashboard for discovered resolvers

## Migration from Non-Layer Setup

Converting an existing app to use layers:

```bash
# Before
your-app/
└── server/
    └── graphql/
        └── (all GraphQL code)

# After
your-app/
├── layers/
│   └── shared/
│       └── server/
│           └── graphql/
│               └── (shared GraphQL code)
└── server/
    └── graphql/
        └── (app-specific GraphQL code)
```

Update config:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['./layers/shared'],
  // ...rest of config
})
```

## Next Steps

- [Nuxt Integration](/ecosystem/nuxt-integration) - Nuxt-specific features
- [Client Usage](/ecosystem/client-usage) - Frontend GraphQL patterns
- [File Organization](/guide/file-organization) - Best practices for structure
- [Type Generation](/guide/type-generation) - Understanding generated types
