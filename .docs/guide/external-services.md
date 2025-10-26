# External Services

Connect to external GraphQL APIs and generate types for third-party services like GitHub, Shopify, Contentful, and more.

## Configuration

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
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }),
          documents: ['app/graphql/github/**/*.graphql'],
        },
      ],
    },
  },
})
```

## Creating Queries

```graphql
# app/graphql/github/get-repository.graphql
query GetRepository($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    id
    name
    description
    stargazerCount
    forkCount
  }
}
```

## Using in Components

```vue
<script setup lang="ts">
const { github } = useGraphql()

const { data } = await useAsyncData('repo', () =>
  github.GetRepository({ owner: 'unjs', name: 'nitro' })
)
</script>

<template>
  <div v-if="data?.repository">
    <h1>{{ data.repository.name }}</h1>
    <p>{{ data.repository.description }}</p>
  </div>
</template>
```

## Type Generation

Types are automatically generated:

```ts
import type { GetRepositoryQuery } from '#graphql/client/github'
```

## Multiple Services

```ts
externalServices: [
  { name: 'github', endpoint: '...' },
  { name: 'shopify', endpoint: '...' },
  { name: 'contentful', endpoint: '...' },
]
```

## Custom Paths

```ts
{
  name: 'github',
  paths: {
    sdk: 'app/graphql/vcs/github-sdk.ts',
    types: 'types/github.d.ts',
  },
}
```

## Next Steps

- [Type Generation](/guide/type-generation)
- [Path Customization](/guide/path-customization)
- [File Generation Control](/guide/file-generation-control)
