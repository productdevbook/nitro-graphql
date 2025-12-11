---
category: Ecosystem
---

# Nuxt Integration

<FunctionInfo fn="nuxtIntegration"/>

Nitro GraphQL provides first-class integration with Nuxt 3, offering seamless full-stack GraphQL development with automatic type generation for both server and client code.

## Installation

Install the required dependencies:

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

## Configuration

Add the Nuxt module to your `nuxt.config.ts`:

```ts
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

::: warning Module Path
For Nuxt projects, always use `nitro-graphql/nuxt` (not just `nitro-graphql`). The `/nuxt` suffix loads the Nuxt-specific module that provides proper integration with Nuxt's module system, layer support, and build process.
:::

## Nuxt-Specific Features

### 1. Auto-Imports

The Nuxt module automatically configures auto-imports for GraphQL utilities:

```ts
// server/graphql/users.resolver.ts
// No need to import these functions - they're auto-imported
export const userQueries = defineQuery({
  users: async (_, __, context) => {
    return await context.storage.getItem('users')
  }
})

export const userMutations = defineMutation({
  createUser: async (_, { input }, context) => {
    return { id: '1', ...input }
  }
})
```

Auto-imported utilities include:
- `defineResolver`
- `defineQuery`
- `defineMutation`
- `defineSubscription`
- `defineField`
- `defineGraphQLConfig`
- `defineSchema`
- `defineDirective`

### 2. Client Composables

Nuxt GraphQL provides composables for easy client-side GraphQL usage:

```vue
<script setup lang="ts">
// useGraphql() composable gives access to your GraphQL SDK
const { GetUsers, CreateUser } = useGraphql()

const { data: users } = await useAsyncData('users', () => GetUsers())

async function addUser() {
  await CreateUser({
    input: { name: 'John', email: 'john@example.com' }
  })
}
</script>
```

### 3. TypeScript Path Aliases

The module automatically configures TypeScript path aliases for seamless imports:

```ts
// Client types - use in components
import type { CreateUserMutation, GetUsersQuery } from '#graphql/client'

// External service types
import type { GetRepositoryQuery } from '#graphql/client/github'

// Server types - use in resolvers
import type { Resolvers, User } from '#graphql/server'
```

These aliases are configured in `.nuxt/tsconfig.json` and work with your IDE's intellisense.

### 4. Auto-Generated Client Utils

For Nuxt projects, the module automatically generates client utilities:

```
app/
└── graphql/
    ├── index.ts                  # Auto-generated barrel export
    ├── default/
    │   ├── sdk.ts               # Type-safe SDK
    │   └── ofetch.ts            # Nuxt-specific HTTP client
    └── [serviceName]/           # External services
        ├── sdk.ts
        └── ofetch.ts
```

The `ofetch.ts` files use Nuxt's `$fetch` and `useRequestHeaders()` for optimal SSR/CSR handling:

```ts
// app/graphql/default/ofetch.ts (auto-generated)
import type { Requester } from './sdk'
import { getSdk } from './sdk'

export function createGraphQLClient(endpoint: string): Requester {
  return async <R>(doc: string, vars?: any): Promise<R> => {
    const headers = import.meta.server ? useRequestHeaders() : undefined

    const result = await $fetch(endpoint, {
      method: 'POST',
      body: { query: doc, variables: vars },
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    })

    return result as R
  }
}

export const $sdk = getSdk(createGraphQLClient('/api/graphql'))
```

### 5. SSR-Ready Request Headers

The generated client automatically forwards request headers in SSR mode, enabling:
- Cookie forwarding for authentication
- Custom header propagation
- Proper session handling

```ts
// In SSR, this automatically forwards headers from the original request
const { data } = await useAsyncData('users', () => $sdk.GetUsers())
```

## Directory Structure Differences

Nuxt projects use a different directory structure compared to standalone Nitro:

### Nuxt Structure

```
your-nuxt-app/
├── server/
│   └── graphql/                 # Server-side GraphQL
│       ├── schema.graphql       # Schema definitions
│       ├── users.resolver.ts    # Resolvers
│       ├── context.ts           # Context augmentation
│       ├── config.ts            # GraphQL server config
│       └── schema.ts            # Schema export
├── app/
│   └── graphql/                 # Client-side GraphQL
│       ├── users/
│       │   ├── queries.graphql
│       │   └── mutations.graphql
│       ├── index.ts             # Auto-generated exports
│       └── default/
│           ├── sdk.ts           # Generated SDK
│           └── ofetch.ts        # Generated HTTP client
├── .nuxt/
│   ├── types/
│   │   ├── nitro-graphql-server.d.ts   # Server types
│   │   └── nitro-graphql-client.d.ts   # Client types
│   └── graphql/
│       └── schema.graphql       # Merged schema
└── graphql.config.ts            # GraphQL IDE config
```

### Nitro Structure (for comparison)

```
your-nitro-app/
├── server/
│   └── graphql/                 # Server-side GraphQL
│       └── (same as Nuxt)
├── graphql/                     # Client-side GraphQL (root level)
│   └── (client queries)
└── .nitro/
    └── types/
        └── (generated types)
```

::: tip Client Directory Location
- **Nuxt**: `app/graphql/` (follows Nuxt conventions)
- **Nitro**: `graphql/` (root level)

This can be customized via the `paths.clientGraphql` option.
:::

## Working with Nuxt Layers

Nuxt GraphQL has full support for Nuxt layers. See the [Nuxt Layers](/ecosystem/nuxt-layers) guide for details.

## Build Integration

### Development Mode

In development, the module:
1. Watches for changes in GraphQL files
2. Regenerates types automatically
3. Hot-reloads server resolvers
4. Provides debug information via `/_nitro/graphql/debug`

```bash
pnpm dev

# Output includes:
# ┌─────────────────────────────────┐
# │  Nitro GraphQL                  │
# │  Framework: graphql-yoga        │
# │  Schemas: 3                     │
# │  Resolvers: 5                   │
# │  Directives: 1                  │
# │  Documents: 8                   │
# │                                 │
# │  Debug Dashboard:               │
# │  /_nitro/graphql/debug          │
# └─────────────────────────────────┘
```

### Production Build

During production builds:
1. All types are generated statically
2. Schemas are merged and validated
3. Resolvers are bundled with code splitting
4. Debug endpoints are automatically disabled

```bash
pnpm build
```

## SSR & Hydration

The module handles SSR/CSR seamlessly:

```vue
<script setup lang="ts">
// This works correctly in both SSR and client-side
const { data } = await useAsyncData('users', async () => {
  const { GetUsers } = useGraphql()
  return await GetUsers()
})
</script>
```

### SSR Benefits

1. **Data Fetching**: Queries execute on the server during SSR
2. **Headers**: Request headers are automatically forwarded
3. **Caching**: Use Nuxt's caching strategies with GraphQL
4. **SEO**: Data is available for SEO and meta tags

### Client-Side Hydration

```vue
<script setup lang="ts">
// Initial load: runs on server
// Navigation: runs on client
const { data } = await useAsyncData('users', () => $sdk.GetUsers())

// Client-only query
const { data: clientData } = await useFetch('/api/graphql', {
  method: 'POST',
  body: { query: '{ users { id name } }' },
  lazy: true, // Skip SSR
})
</script>
```

## Custom Client Configuration

You can customize the auto-generated client:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    graphql: {
      framework: 'graphql-yoga',

      // Control client utilities generation
      clientUtils: {
        enabled: true,
        index: 'app/graphql/index.ts',
        ofetch: 'app/graphql/{serviceName}/ofetch.ts',
      },

      // Control SDK generation
      sdk: {
        enabled: true,
        main: 'app/graphql/default/sdk.ts',
        external: 'app/graphql/{serviceName}/sdk.ts',
      },
    },
  },
})
```

Or disable auto-generation entirely:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    graphql: {
      framework: 'graphql-yoga',
      clientUtils: false, // Disable client utils generation
      sdk: false, // Disable SDK generation
    },
  },
})
```

## Example: Authentication with Nuxt

Here's a complete example integrating authentication:

```ts
// server/graphql/context.ts
import type { H3Event } from 'nitro/h3'

declare module 'nitro/h3' {
  interface H3EventContext {
    user?: {
      id: string
      email: string
      role: 'admin' | 'user'
    }
  }
}
```

```ts
// server/graphql/config.ts
export default defineGraphQLConfig({
  context: async ({ event }) => {
    // Extract auth from request
    const session = await useSession(event, {
      password: 'my-secret-password-at-least-32-chars',
    })

    const user = session.data.user

    if (user) {
      event.context.user = user
    }

    return { event }
  },
})
```

```ts
// server/graphql/users.resolver.ts
export const userQueries = defineQuery({
  me: async (_, __, context) => {
    // Access authenticated user
    if (!context.user) {
      throw new Error('Unauthorized')
    }

    return context.user
  },
})
```

```vue
<!-- app/pages/profile.vue -->
<script setup lang="ts">
const { GetMe } = useGraphql()

const { data: user } = await useAsyncData('me', () => GetMe())

if (!user.value?.me) {
  navigateTo('/login')
}
</script>

<template>
  <div v-if="user?.me">
    <h1>Welcome, {{ user.me.email }}</h1>
  </div>
</template>
```

## Performance Optimization

### 1. Code Splitting

GraphQL files are automatically code-split:

```
.output/server/chunks/graphql/
├── resolvers.mjs    # All resolvers
└── schemas.mjs      # All schemas
```

### 2. Tree Shaking

Only import what you need:

```ts
// This only bundles GetUsers query
const { GetUsers } = useGraphql()
await GetUsers()
```

### 3. Type Generation Caching

Types are cached and only regenerated when:
- Schema files change
- Query/mutation files change
- External service schemas update

## Troubleshooting

### Types Not Updating

**Problem**: Changes to GraphQL files don't update types

**Solution**:
1. Restart the dev server
2. Check `.nuxt/types/` for generated files
3. Verify file naming conventions (`.graphql` extension)
4. Check console for generation errors

### Module Not Found

**Problem**: `Cannot find module 'nitro-graphql/nuxt'`

**Solution**:
```bash
# Delete node_modules and reinstall
rm -rf node_modules
pnpm install
```

### useGraphql is not defined

**Problem**: Composable is not available

**Solution**:
1. Ensure you have client queries in `app/graphql/**/*.graphql`
2. Check that `app/graphql/index.ts` exists
3. Restart the dev server
4. Verify module is in `nuxt.config.ts` modules array

### Headers Not Forwarding in SSR

**Problem**: Authentication doesn't work in SSR

**Solution**:
- The auto-generated `ofetch.ts` should include:
  ```ts
  const headers = import.meta.server ? useRequestHeaders() : undefined
  ```
- Ensure you're using the generated SDK, not a custom client
- Check that cookies are being sent from the browser

## Comparing with Standalone Nitro

| Feature | Nuxt | Standalone Nitro |
|---------|------|-----------------|
| **Client Directory** | `app/graphql/` | `graphql/` |
| **Auto-Imports** | Yes, via Nuxt | Via Nitro imports |
| **Composables** | `useGraphql()` | Not available |
| **Client Utils** | Auto-generated with `$fetch` | Not auto-generated |
| **SSR Support** | Full SSR/CSR | Server-only |
| **Layers Support** | Full support | Not applicable |
| **Build Dir** | `.nuxt/` | `.nitro/` |
| **Module Path** | `nitro-graphql/nuxt` | `nitro-graphql` |

## Next Steps

- [Nuxt Layers](/ecosystem/nuxt-layers) - Multi-layer GraphQL setup
- [Client Usage](/ecosystem/client-usage) - Frontend GraphQL patterns
- [Context](/guide/context) - Request context and middleware
- [External Services](/guide/external-services) - Third-party GraphQL APIs

---

## Source
<SourceLinks fn="nuxtIntegration"/>

## Contributors
<Contributors fn="nuxtIntegration"/>

## Changelog
<Changelog fn="nuxtIntegration"/>
