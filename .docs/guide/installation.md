# Installation

## Prerequisites

Before installing Nitro GraphQL, make sure you have:

- **Node.js** 18.0.0 or higher
- **pnpm**, **npm**, or **yarn** package manager
- A **Nitro** or **Nuxt** project (or create a new one)

## Create a New Project

### Nitro Project

```bash
# Create a new Nitro project
npx giget@latest nitro my-nitro-app
cd my-nitro-app
```

### Nuxt Project

```bash
# Create a new Nuxt project
npx nuxi@latest init my-nuxt-app
cd my-nuxt-app
```

## Install Nitro GraphQL

Choose your GraphQL framework and install the required dependencies:

::: code-group

```bash [GraphQL Yoga (Recommended)]
pnpm add nitro-graphql graphql-yoga graphql
```

```bash [Apollo Server]
pnpm add nitro-graphql @apollo/server @apollo/utils.withrequired @as-integrations/h3 graphql
```

:::

### Why GraphQL Yoga?

GraphQL Yoga is recommended for most use cases because it:
- Has a smaller bundle size
- Performs faster
- Requires less configuration
- Has better developer experience

[See full comparison →](/guide/framework-comparison)

## Configuration

### Nitro Configuration

Add Nitro GraphQL to your `nitro.config.ts`:

```typescript
// nitro.config.ts
import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  modules: ['nitro-graphql'],
  graphql: {
    framework: 'graphql-yoga', // or 'apollo-server'
  },
})
```

### Nuxt Configuration

For Nuxt projects, configure in `nuxt.config.ts`:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nitro-graphql/nuxt'],
  nitro: {
    graphql: {
      framework: 'graphql-yoga', // or 'apollo-server'
    },
  },
})
```

## Project Structure

After installation, create this structure:

::: code-group

```txt [Nitro Project]
my-nitro-app/
├── server/
│   └── graphql/
│       ├── schema.graphql      # Your GraphQL schema
│       ├── config.ts           # Auto-generated config
│       ├── context.ts          # Auto-generated context types
│       └── schema.ts           # Auto-generated schema loader
├── nitro.config.ts
└── package.json
```

```txt [Nuxt Project]
my-nuxt-app/
├── server/
│   └── graphql/
│       ├── schema.graphql      # Your GraphQL schema
│       ├── config.ts           # Auto-generated config
│       ├── context.ts          # Auto-generated context types
│       └── schema.ts           # Auto-generated schema loader
├── app/
│   └── graphql/                # Client queries (optional)
│       └── queries/
├── nuxt.config.ts
└── package.json
```

:::

## Verify Installation

### 1. Create a Schema

Create `server/graphql/schema.graphql`:

```graphql
type Query {
  hello: String!
}

type Mutation {
  _empty: String
}
```

::: tip
The `Mutation` type with `_empty` field is required by GraphQL spec even if you don't have mutations yet.
:::

### 2. Create a Resolver

Create `server/graphql/hello.resolver.ts`:

```typescript
export const helloQuery = defineQuery({
  hello: () => 'Hello from Nitro GraphQL!',
})
```

### 3. Start the Development Server

::: code-group

```bash [Nitro]
npm run dev
```

```bash [Nuxt]
npm run dev
```

:::

### 4. Test Your API

Open your browser and navigate to:

```
http://localhost:3000/api/graphql
```

You should see the **Apollo Sandbox** interface. Try this query:

```graphql
query {
  hello
}
```

Expected response:

```json
{
  "data": {
    "hello": "Hello from Nitro GraphQL!"
  }
}
```

## TypeScript Support

Nitro GraphQL automatically generates TypeScript types. After starting the dev server, you'll find:

::: code-group

```txt [Nitro]
.nitro/
└── types/
    ├── nitro-graphql-server.d.ts    # Server-side types
    └── nitro-graphql-client.d.ts    # Client-side types
```

```txt [Nuxt]
.nuxt/
└── types/
    ├── nitro-graphql-server.d.ts    # Server-side types
    └── nitro-graphql-client.d.ts    # Client-side types
```

:::

Import these types in your resolvers:

```typescript
import type { User } from '#graphql/server'

export const userQueries = defineQuery({
  user: async (_, { id }): Promise<User | null> => {
    // Fully typed!
    return await db.user.findUnique({ where: { id } })
  },
})
```

## Additional Dependencies

### For Database Integration

```bash
# Prisma
pnpm add prisma @prisma/client
pnpm add -D prisma

# Drizzle
pnpm add drizzle-orm
pnpm add -D drizzle-kit

# Mongoose
pnpm add mongoose
```

### For Authentication

```bash
# JWT
pnpm add jsonwebtoken
pnpm add -D @types/jsonwebtoken

# Lucia Auth
pnpm add lucia
```

### For Subscriptions

```bash
# GraphQL Subscriptions (Yoga)
pnpm add graphql-yoga

# Already included with Yoga!
```

### For Federation

```bash
# Apollo Federation
pnpm add @apollo/subgraph
```

## IDE Setup

### VS Code

Install the GraphQL extension for syntax highlighting and autocomplete:

```bash
code --install-extension GraphQL.vscode-graphql
```

The module automatically generates a `graphql.config.ts` file that the extension will use.

### WebStorm/IntelliJ

Enable the GraphQL plugin:
1. Go to **Settings** → **Plugins**
2. Search for **GraphQL**
3. Install and restart

## Troubleshooting Installation

### Module Not Found

If you see `Cannot find module 'nitro-graphql'`:

1. Clear your `node_modules` and lockfile:
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

2. Restart your development server

### Types Not Generated

If TypeScript types aren't generating:

1. Delete the build directory:
```bash
# Nitro
rm -rf .nitro

# Nuxt
rm -rf .nuxt
```

2. Restart the dev server
3. Check that your GraphQL files are in the correct location

### Port Already in Use

If port 3000 is already in use:

```typescript
// nitro.config.ts
export default defineNitroConfig({
  dev: {
    port: 3001, // Use a different port
  },
  modules: ['nitro-graphql'],
  graphql: {
    framework: 'graphql-yoga',
  },
})
```

## Next Steps

<div class="next-steps">

- **[Quick Start (Nitro)](/guide/quick-start-nitro)** - Build your first API in 5 minutes
- **[Quick Start (Nuxt)](/guide/quick-start-nuxt)** - Full-stack Nuxt setup
- **[Schemas](/guide/schemas)** - Learn about GraphQL schemas
- **[Resolvers](/guide/resolvers)** - Understand resolvers

</div>

<style scoped>
.next-steps {
  margin: 32px 0;
  padding: 24px;
  background-color: var(--vp-c-bg-soft);
  border-radius: 8px;
  border-left: 4px solid var(--vp-c-brand-1);
}

.next-steps a {
  display: block;
  padding: 8px 0;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 600;
}

.next-steps a:hover {
  color: var(--vp-c-brand-2);
}
</style>
