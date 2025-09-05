# Nitro GraphQL

<div align="center">

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

**The easiest way to add GraphQL to any Nitro application**

🚀 **Auto-discovery** • 📝 **Type Generation** • 🎮 **Apollo Sandbox** • 🔧 **Zero Config**

[Quick Start](#-quick-start) • [Examples](#-examples) • [Documentation](#-documentation) • [Community](#-community)

</div>

---

## 🎥 Watch & Learn

- [**Nuxt 4 Integration**](https://x.com/productdevbook/status/1947314569531076633) - Step-by-step Nuxt setup
- [**Standalone Nitro**](https://x.com/productdevbook/status/1945759751393976348) - Basic Nitro integration

## ✨ Why Nitro GraphQL?

- ⚡ **5-minute setup** - From zero to GraphQL in minutes
- 🔍 **Auto-discovery** - Scans your files, builds your schema
- 📝 **Type-safe** - Full TypeScript support with auto-generated types
- 🎯 **Universal** - Works with Nuxt, Nitro, and any Nitro-based framework
- 🎮 **Developer-friendly** - Built-in Apollo Sandbox for testing
- 🔧 **Zero config** - Sensible defaults, customize when needed

## 🚀 Quick Start

### 1. Install

**GraphQL Yoga (recommended):**
```bash
pnpm add nitro-graphql graphql-yoga graphql
```

**Apollo Server:**
```bash
pnpm add nitro-graphql @apollo/server @apollo/utils.withrequired @as-integrations/h3 graphql
```

### 2. Configure

<details>
<summary>🔧 <strong>Nitro Project</strong></summary>

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

</details>

<details>
<summary>🟢 <strong>Nuxt Project</strong></summary>

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nitro-graphql/nuxt'],
  nitro: {
    graphql: {
      framework: 'graphql-yoga',
    },
  },
})
```

</details>

### 3. Create Your Schema

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

### 4. Add Resolvers

```ts
// server/graphql/hello.resolver.ts
export const helloResolver = defineResolver({
  Query: {
    hello: () => 'Hello from GraphQL!',
    greeting: (_, { name }) => `Hello, ${name}!`,
  },
})
```

### 5. Start Development

```bash
pnpm dev
```

🎉 **That's it!** Your GraphQL server is ready at:
- **Endpoint**: `http://localhost:3000/api/graphql`
- **Playground**: `http://localhost:3000/api/graphql` (browser)
- **Health**: `http://localhost:3000/api/graphql/health`

## 🎮 Examples

Try these working examples:

| Example | Description | Demo |
|---------|-------------|------|
| [**Nitro Basic**](./playgrounds/nitro/) | Standalone Nitro with GraphQL | `pnpm playground:nitro` |
| [**Nuxt Integration**](./playgrounds/nuxt/) | Full Nuxt app with client types | `pnpm playground:nuxt` |
| [**Apollo Federation**](./playgrounds/federation/) | Federated GraphQL services | `pnpm playground:federation` |

## 🏗️ Building Your First Feature

Let's create a complete user management system:

### 1. Define Schema
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

### 2. Create Resolvers
```ts
// server/graphql/users/user.resolver.ts
export const userQueries = defineQuery({
  users: async (_, __, { storage }) => {
    return await storage.getItem('users') || []
  },
  user: async (_, { id }, { storage }) => {
    const users = await storage.getItem('users') || []
    return users.find(user => user.id === id)
  }
})

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
```

### 3. Test in Apollo Sandbox
```graphql
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

query {
  users {
    id
    name
    email
  }
}
```

## 🚀 Advanced Features

<details>
<summary><strong>🎭 Custom Directives</strong></summary>

Create reusable GraphQL directives:

```ts
// server/graphql/directives/auth.directive.ts
export const authDirective = defineDirective({
  name: 'auth',
  locations: ['FIELD_DEFINITION'],
  args: {
    requires: { type: 'String', defaultValue: 'USER' }
  },
  transformer: (schema) => {
    // Add authentication logic
  }
})
```

Use in schema:
```graphql
type Query {
  users: [User!]! @auth(requires: "ADMIN")
  profile: User! @auth
}
```

</details>

<details>
<summary><strong>🌐 External GraphQL Services</strong></summary>

Connect to multiple GraphQL APIs:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    graphql: {
      framework: 'graphql-yoga',
      externalServices: [
        {
          name: 'github',
          schema: 'https://api.github.com/graphql',
          endpoint: 'https://api.github.com/graphql',
          headers: () => ({
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
          })
        }
      ]
    }
  }
})
```

</details>

<details>
<summary><strong>🔄 Apollo Federation</strong></summary>

Build federated GraphQL services:

```ts
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'apollo-server',
    federation: {
      enabled: true,
      serviceName: 'users-service'
    }
  }
})
```

</details>

## 📖 Documentation

### Core Utilities

All utilities are auto-imported in resolver files:

| Function | Purpose | Example |
|----------|---------|---------|
| `defineResolver` | Complete resolvers | `defineResolver({ Query: {...}, Mutation: {...} })` |
| `defineQuery` | Query-only resolvers | `defineQuery({ users: () => [...] })` |
| `defineMutation` | Mutation-only resolvers | `defineMutation({ createUser: (...) => {...} })` |
| `defineType` | Custom type resolvers | `defineType({ User: { posts: (parent) => [...] } })` |
| `defineDirective` | Custom directives | `defineDirective({ name: 'auth', ... })` |

### Type Generation

Automatic TypeScript types are generated:
- **Server types**: `#graphql/server` - Use in resolvers and server code
- **Client types**: `#graphql/client` - Use in frontend components

```ts
// Server-side
import type { User, CreateUserInput } from '#graphql/server'

// Client-side  
import type { GetUsersQuery, CreateUserMutation } from '#graphql/client'
```

### Project Structure

```
server/
├── graphql/
│   ├── schema.graphql              # Main schema
│   ├── hello.resolver.ts           # Basic resolvers
│   ├── users/
│   │   ├── user.graphql           # User schema
│   │   └── user.resolver.ts       # User resolvers
│   ├── directives/                # Custom directives
│   └── config.ts                  # Optional GraphQL config
```

> **⚠️ Important**: Use **named exports** for all resolvers:
> ```ts
> // ✅ Correct
> export const userQueries = defineQuery({...})
> 
> // ❌ Deprecated
> export default defineQuery({...})
> ```

## 🚨 Troubleshooting

<details>
<summary><strong>Common Issues</strong></summary>

**GraphQL endpoint returns 404**
- ✅ Check `nitro-graphql` is in modules
- ✅ Set `graphql.framework` option
- ✅ Create at least one `.graphql` file

**Types not generating**
- ✅ Restart dev server
- ✅ Check file naming: `*.graphql`, `*.resolver.ts`
- ✅ Verify exports are named exports

**Import errors**
- ✅ Use correct path: `nitro-graphql/utils/define`
- ✅ Use named exports in resolvers

</details>

## 🌟 Production Usage

This package powers production applications:

- [**Nitroping**](https://github.com/productdevbook/nitroping) - Self-hosted push notification service

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Build module
pnpm build

# Watch mode
pnpm dev

# Run playgrounds
pnpm playground:nitro
pnpm playground:nuxt
pnpm playground:federation

# Lint
pnpm lint
```

## 💬 Community

> [!TIP]
> **Want to contribute?** We believe you can play a role in the growth of this project!

### Ways to Contribute
- 💡 **Share ideas** via [GitHub Issues](https://github.com/productdevbook/nitro-graphql/issues)
- 🐛 **Report bugs** with detailed information
- 📖 **Improve docs** - README, examples, guides
- 🔧 **Code contributions** - Bug fixes and features
- 🌟 **Star the project** to show support

### Help Wanted
- [ ] Performance benchmarks
- [ ] Video tutorials
- [ ] Database adapter guides
- [ ] VS Code extension

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