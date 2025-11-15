---
title: Quick Start - Nitro
category: Guide
---

# Quick Start: Nitro

<FunctionInfo fn="quickStartNitro"/>

Get a GraphQL API running in your Nitro project in 5 minutes.

## Prerequisites

- Node.js 24 or higher
- pnpm, npm, or yarn
- Basic knowledge of TypeScript and GraphQL

## Step 1: Install Dependencies

::: code-group

```bash [pnpm]
pnpm add nitro-graphql@beta graphql-yoga graphql graphql-config
```

```bash [npm]
npm install nitro-graphql@beta graphql-yoga graphql graphql-config
```

```bash [yarn]
yarn add nitro-graphql@beta graphql-yoga graphql graphql-config
```

:::

::: tip Why GraphQL Yoga?
GraphQL Yoga is the recommended framework for its smaller bundle size, better performance, and simpler setup. You can also use [Apollo Server](/guide/apollo-server) if you need federation support.
:::

## Step 2: Configure Nitro

Add `nitro-graphql` to your Nitro modules:

```ts
// nitro.config.ts
import graphql from 'nitro-graphql'
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  modules: [
    graphql({
      framework: 'graphql-yoga',
    }),
  ],
})
```

::: info Configuration Options
The `graphql` configuration object supports many options. We're using the minimal setup here. Learn more in the [Configuration Reference](/reference/config).
:::

## Step 3: Create Your Schema

Create a GraphQL schema file in your server directory:

```graphql
# server/graphql/schema.graphql
type Query {
  hello: String!
  greeting(name: String!): String!
}

type Mutation {
  _empty: String
}
```

::: warning File Location
Schema files must be placed in `server/graphql/` or subdirectories. The module automatically discovers all `.graphql` files in this directory.
:::

## Step 4: Add Resolvers

Create a resolver file to implement your queries:

```ts
// server/graphql/hello.resolver.ts
import { defineResolver } from 'nitro-graphql/define'

export const helloResolver = defineResolver({
  Query: {
    hello: () => 'Hello from GraphQL!',
    greeting: (parent, { name }) => `Hello, ${name}!`,
  },
})
```

::: danger Important: Named Exports
You MUST use named exports for resolvers. Default exports will not work:

```ts
// ✅ Correct
export const helloResolver = defineResolver({...})

// ❌ Wrong - will not be discovered
export default defineResolver({...})
```
:::

## Step 5: Start Development Server

```bash
pnpm dev
```

Your GraphQL server is now running! You should see output like:

```
✔ Nitro built in X ms
  ➜ Local:    http://localhost:3000/
```

## Step 6: Test Your API

Open your browser to:

- **GraphQL Playground**: [http://localhost:3000/api/graphql](http://localhost:3000/api/graphql)
- **Health Check**: [http://localhost:3000/api/graphql/health](http://localhost:3000/api/graphql/health)

### Try Your First Query

In the GraphQL playground, run:

```graphql
query {
  hello
}
```

Response:
```json
{
  "data": {
    "hello": "Hello from GraphQL!"
  }
}
```

### Query with Arguments

```graphql
query {
  greeting(name: "World")
}
```

Response:
```json
{
  "data": {
    "greeting": "Hello, World!"
  }
}
```

## What Just Happened?

Behind the scenes, Nitro GraphQL:

1. **Scanned** your `server/graphql/` directory
2. **Discovered** your `schema.graphql` and `hello.resolver.ts` files
3. **Merged** your schemas into a unified GraphQL schema
4. **Loaded** your resolvers
5. **Generated** TypeScript types (check `.nitro/types/nitro-graphql-server.d.ts`)
6. **Created** a GraphQL endpoint at `/api/graphql`
7. **Set up** hot reload for development

## File Structure

Your project should now look like this:

```
your-project/
├── server/
│   └── graphql/
│       ├── schema.graphql          # Your schema
│       └── hello.resolver.ts       # Your resolvers
├── .nitro/
│   └── types/
│       └── nitro-graphql-server.d.ts  # Auto-generated types
├── graphql.config.ts               # Auto-generated GraphQL config
├── nitro.config.ts                 # Your Nitro config
└── package.json
```

::: tip Auto-Generated Files
The following files are auto-generated and should not be edited:
- `graphql.config.ts` - GraphQL IDE configuration
- `.nitro/types/nitro-graphql-server.d.ts` - TypeScript type definitions
- `server/graphql/schema.ts` - Schema export (if it doesn't exist)
- `server/graphql/context.ts` - H3 context types (if it doesn't exist)
- `server/graphql/config.ts` - GraphQL Yoga config (if it doesn't exist)
:::

## Next Steps

Now that you have a working GraphQL API, you can:

<div class="next-steps-grid">
<div class="next-step-card">
<h3>📝 Build Your First Feature</h3>
<p>Learn how to create queries and mutations</p>
<a href="/guide/your-first-query">Your First Query →</a>
</div>

<div class="next-step-card">
<h3>🎯 Use TypeScript Types</h3>
<p>Leverage auto-generated types for type safety</p>
<a href="/guide/type-generation">Type Generation →</a>
</div>

<div class="next-step-card">
<h3>🗂️ Organize Your Code</h3>
<p>Learn best practices for file organization</p>
<a href="/guide/file-organization">File Organization →</a>
</div>

<div class="next-step-card">
<h3>🔧 Add Context</h3>
<p>Access H3 event context in your resolvers</p>
<a href="/guide/context">Working with Context →</a>
</div>
</div>

## Common Issues

### GraphQL endpoint returns 404

**Solution**: Make sure `nitro-graphql` is listed in your `modules` array and you've set the `graphql.framework` option.

### defineResolver is not defined

**Solution**: Make sure you import resolver utilities from `nitro-graphql/define`:

```ts
import { defineResolver } from 'nitro-graphql/define'
```

### Types not generating

**Solution**:
1. Check that your schema files end with `.graphql`
2. Check that your resolver files end with `.resolver.ts`
3. Restart the dev server
4. Look for the generated file at `.nitro/types/nitro-graphql-server.d.ts`

### Vite parse errors on .graphql files

**Solution**: If you're using Vite with Nitro, add the GraphQL plugin:

```ts
import { graphql } from 'nitro-graphql/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    graphql(), // ← Must be before nitro()
    nitro(),
  ]
})
```

## Learn More

- [Create Your First Query](/guide/your-first-query)
- [Understanding Schemas](/guide/schemas)
- [Working with Resolvers](/guide/resolvers)
- [Type Generation](/guide/type-generation)

<style scoped>
.next-steps-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin: 24px 0;
}

.next-step-card {
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  transition: all 0.3s;
}

.next-step-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(225, 0, 152, 0.1);
}

.next-step-card h3 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 16px;
}

.next-step-card p {
  margin-bottom: 12px;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.next-step-card a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
}

@media (max-width: 768px) {
  .next-steps-grid {
    grid-template-columns: 1fr;
  }
}
</style>

---

## Source

<SourceLinks fn="quickStartNitro"/>

## Contributors

<Contributors fn="quickStartNitro"/>

## Changelog

<Changelog fn="quickStartNitro"/>
