# External GraphQL Services

This directory contains GraphQL queries and mutations for external services.

## Using External Services

1. Configure external services in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  nitro: {
    graphql: {
      framework: 'graphql-yoga',
      externalServices: [
        {
          name: 'jsonplaceholder',
          schema: 'https://jsonplaceholder.ir/graphql',
          endpoint: 'https://jsonplaceholder.ir/graphql',
          documents: ['app/graphql/external/jsonplaceholder/**/*.graphql']
        },
        {
          name: 'github',
          schema: 'https://docs.github.com/public/schema.docs.graphql',
          endpoint: 'https://api.github.com/graphql',
          headers: () => ({
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
          }),
          documents: ['app/graphql/external/github/**/*.graphql']
        }
      ]
    }
  }
})
```

2. Create GraphQL documents in service-specific directories
3. Use generated SDKs in your components:

```ts
import { $githubSdk } from '~/app/graphql/ofetch-github'
// Auto-generated files will be available:
import { $jsonplaceholderSdk } from '~/app/graphql/ofetch-jsonplaceholder'

// Use in composables or components
const { posts } = await $jsonplaceholderSdk.GetPosts()
const { repository } = await $githubSdk.GetRepository({ owner: 'user', name: 'repo' })
```

## Generated Files

For each external service, the following files will be generated:
- `sdk-{serviceName}.ts` - Type-safe SDK
- `ofetch-{serviceName}.ts` - Nuxt-specific client (auto-generated once)
- `.nitro/types/nitro-graphql-client-{serviceName}.d.ts` - TypeScript types

## Type Safety

External service types are available under:
```ts
import type { GetRepositoryQuery } from '#graphql/client/github'
import type { GetPostsQuery } from '#graphql/client/jsonplaceholder'
```
