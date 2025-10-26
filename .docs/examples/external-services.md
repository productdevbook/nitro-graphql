# External GraphQL Services Integration

This example demonstrates how to integrate external GraphQL APIs (like GitHub, Shopify, or any GraphQL service) into your Nuxt or Nitro application with automatic type generation and type-safe SDKs.

## Features Demonstrated

- External GraphQL service integration
- Automatic schema downloading and type generation
- Type-safe SDK generation for external services
- Custom headers and authentication
- Multiple external services in one project
- Service-specific query documents
- Client-side usage in Nuxt components

## Use Cases

- GitHub API for repository and user data
- Shopify Storefront API for e-commerce
- Contentful/Strapi for CMS content
- Public APIs like Countries, SpaceX, Rick and Morty
- Internal microservices with GraphQL APIs
- Third-party SaaS GraphQL APIs

## Project Structure

```
my-app/
├── app/
│   ├── graphql/
│   │   ├── github/
│   │   │   ├── queries.graphql       # GitHub-specific queries
│   │   │   ├── sdk.ts                # Auto-generated GitHub SDK
│   │   │   └── ofetch.ts             # Auto-generated fetch client
│   │   ├── shopify/
│   │   │   ├── queries.graphql       # Shopify-specific queries
│   │   │   ├── sdk.ts                # Auto-generated Shopify SDK
│   │   │   └── ofetch.ts             # Auto-generated fetch client
│   │   └── countries/
│   │       ├── queries.graphql       # Countries API queries
│   │       ├── sdk.ts                # Auto-generated Countries SDK
│   │       └── ofetch.ts             # Auto-generated fetch client
│   ├── composables/
│   │   ├── useGitHub.ts              # GitHub composable
│   │   └── useCountries.ts           # Countries composable
│   └── pages/
│       └── index.vue
├── server/
│   └── graphql/
│       └── ... (your internal GraphQL schema)
├── nuxt.config.ts                    # Configuration with external services
└── package.json
```

## Configuration

### nuxt.config.ts

```typescript
export default defineNuxtConfig({
  modules: ['nitro-graphql/nuxt'],
  nitro: {
    modules: ['nitro-graphql'],
    graphql: {
      framework: 'graphql-yoga',
      externalServices: [
        // GitHub API
        {
          name: 'github',
          schema: 'https://api.github.com/graphql',
          endpoint: 'https://api.github.com/graphql',
          downloadSchema: true,
          documents: ['app/graphql/github/**/*.graphql'],
          headers: () => ({
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }),
        },
        // Shopify Storefront API
        {
          name: 'shopify',
          schema: 'https://your-store.myshopify.com/api/2024-01/graphql.json',
          endpoint: 'https://your-store.myshopify.com/api/2024-01/graphql.json',
          downloadSchema: true,
          documents: ['app/graphql/shopify/**/*.graphql'],
          headers: () => ({
            'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_TOKEN,
          }),
        },
        // Countries API (public, no auth)
        {
          name: 'countries',
          schema: 'https://countries.trevorblades.com',
          endpoint: 'https://countries.trevorblades.com',
          downloadSchema: true,
          documents: ['app/graphql/countries/**/*.graphql'],
        },
      ],
    },
  },
})
```

### Environment Variables (.env)

```bash
# GitHub API Token (create at https://github.com/settings/tokens)
GITHUB_TOKEN=ghp_your_github_token_here

# Shopify Storefront API Token
SHOPIFY_TOKEN=your_shopify_storefront_token
```

## GitHub API Example

### app/graphql/github/queries.graphql

```graphql
# Get viewer (authenticated user) profile
query GetViewer {
  viewer {
    login
    name
    email
    bio
    avatarUrl
    url
    followers {
      totalCount
    }
    repositories(first: 10, orderBy: { field: UPDATED_AT, direction: DESC }) {
      totalCount
      nodes {
        id
        name
        description
        url
        stargazerCount
        forkCount
        primaryLanguage {
          name
          color
        }
        updatedAt
      }
    }
  }
}

# Get specific repository
query GetRepository($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    id
    name
    description
    url
    stargazerCount
    forkCount
    isPrivate
    primaryLanguage {
      name
      color
    }
    owner {
      login
      avatarUrl
    }
    issues(first: 5, states: OPEN) {
      totalCount
      nodes {
        id
        title
        url
        createdAt
      }
    }
    pullRequests(first: 5, states: OPEN) {
      totalCount
      nodes {
        id
        title
        url
        createdAt
      }
    }
  }
}

# Search repositories
query SearchRepositories($query: String!, $first: Int = 10) {
  search(query: $query, type: REPOSITORY, first: $first) {
    repositoryCount
    nodes {
      ... on Repository {
        id
        name
        description
        url
        stargazerCount
        primaryLanguage {
          name
          color
        }
        owner {
          login
          avatarUrl
        }
      }
    }
  }
}

# Get user profile
query GetUser($login: String!) {
  user(login: $login) {
    login
    name
    bio
    avatarUrl
    url
    company
    location
    websiteUrl
    followers {
      totalCount
    }
    following {
      totalCount
    }
    repositories(first: 10, orderBy: { field: STARGAZERS, direction: DESC }) {
      totalCount
      nodes {
        id
        name
        description
        url
        stargazerCount
      }
    }
  }
}
```

### app/composables/useGitHub.ts

```typescript
import type {
  GetRepositoryQuery,
  GetRepositoryQueryVariables,
  GetViewerQuery,
  SearchRepositoriesQuery,
  SearchRepositoriesQueryVariables,
} from '#graphql/client/github'

export function useGitHub() {
  const viewer = ref<GetViewerQuery['viewer'] | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchViewer = async () => {
    isLoading.value = true
    error.value = null

    try {
      const { data } = await $githubSdk.GetViewer()
      viewer.value = data?.viewer || null
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch viewer'
      console.error('GitHub API error:', err)
    }
    finally {
      isLoading.value = false
    }
  }

  const fetchRepository = async (owner: string, name: string) => {
    isLoading.value = true
    error.value = null

    try {
      const { data } = await $githubSdk.GetRepository({ owner, name })
      return data?.repository
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch repository'
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  const searchRepositories = async (query: string, first: number = 10) => {
    isLoading.value = true
    error.value = null

    try {
      const { data } = await $githubSdk.SearchRepositories({ query, first })
      return data?.search
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to search repositories'
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    viewer: readonly(viewer),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchViewer,
    fetchRepository,
    searchRepositories,
  }
}
```

### app/pages/github.vue

```vue
<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">GitHub Profile</h1>

    <div v-if="isLoading" class="text-center py-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Loading GitHub data...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-600">{{ error }}</p>
    </div>

    <div v-else-if="viewer" class="space-y-6">
      <!-- Profile Card -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <div class="flex items-center space-x-4">
          <img
            :src="viewer.avatarUrl"
            :alt="viewer.name"
            class="w-20 h-20 rounded-full"
          />
          <div>
            <h2 class="text-2xl font-bold">{{ viewer.name }}</h2>
            <p class="text-gray-600">@{{ viewer.login }}</p>
            <p class="text-gray-700 mt-2">{{ viewer.bio }}</p>
          </div>
        </div>

        <div class="mt-4 flex space-x-4">
          <div class="text-center">
            <div class="text-2xl font-bold">{{ viewer.followers.totalCount }}</div>
            <div class="text-sm text-gray-600">Followers</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold">{{ viewer.repositories.totalCount }}</div>
            <div class="text-sm text-gray-600">Repositories</div>
          </div>
        </div>
      </div>

      <!-- Repositories -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h3 class="text-xl font-bold mb-4">Recent Repositories</h3>
        <div class="space-y-4">
          <div
            v-for="repo in viewer.repositories.nodes"
            :key="repo.id"
            class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div class="flex items-start justify-between">
              <div>
                <a
                  :href="repo.url"
                  target="_blank"
                  class="text-lg font-semibold text-blue-600 hover:underline"
                >
                  {{ repo.name }}
                </a>
                <p class="text-gray-600 text-sm mt-1">{{ repo.description }}</p>
                <div class="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span v-if="repo.primaryLanguage" class="flex items-center">
                    <span
                      class="w-3 h-3 rounded-full mr-1"
                      :style="{ backgroundColor: repo.primaryLanguage.color }"
                    ></span>
                    {{ repo.primaryLanguage.name }}
                  </span>
                  <span>⭐ {{ repo.stargazerCount }}</span>
                  <span>🍴 {{ repo.forkCount }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { viewer, isLoading, error, fetchViewer } = useGitHub()

onMounted(() => {
  fetchViewer()
})

useHead({
  title: 'GitHub Profile',
})
</script>
```

## Countries API Example

### app/graphql/countries/queries.graphql

```graphql
query GetCountries {
  countries {
    code
    name
    emoji
    capital
    currency
    continent {
      name
      code
    }
  }
}

query GetCountry($code: ID!) {
  country(code: $code) {
    code
    name
    emoji
    phone
    capital
    currency
    native
    continent {
      name
      code
    }
    languages {
      name
      code
      native
    }
    states {
      name
      code
    }
  }
}

query GetContinents {
  continents {
    code
    name
    countries {
      code
      name
      emoji
    }
  }
}
```

### app/composables/useCountries.ts

```typescript
import type {
  GetCountriesQuery,
  GetCountryQuery,
  GetCountryQueryVariables,
} from '#graphql/client/countries'

export function useCountries() {
  const countries = ref<GetCountriesQuery['countries']>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchCountries = async () => {
    isLoading.value = true
    error.value = null

    try {
      const { data } = await $countriesSdk.GetCountries()
      countries.value = data?.countries || []
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch countries'
      console.error('Countries API error:', err)
    }
    finally {
      isLoading.value = false
    }
  }

  const fetchCountry = async (code: string) => {
    try {
      const { data } = await $countriesSdk.GetCountry({ code })
      return data?.country
    }
    catch (err) {
      console.error('Failed to fetch country:', err)
      throw err
    }
  }

  const searchCountries = (query: string) => {
    return countries.value.filter(
      country =>
        country.name.toLowerCase().includes(query.toLowerCase())
        || country.code.toLowerCase().includes(query.toLowerCase())
    )
  }

  return {
    countries: readonly(countries),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchCountries,
    fetchCountry,
    searchCountries,
  }
}
```

## Shopify Storefront API Example

### app/graphql/shopify/queries.graphql

```graphql
query GetProducts($first: Int = 10) {
  products(first: $first) {
    edges {
      node {
        id
        title
        description
        handle
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 1) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 1) {
          edges {
            node {
              id
              title
              priceV2 {
                amount
                currencyCode
              }
              availableForSale
            }
          }
        }
      }
    }
  }
}

query GetProduct($handle: String!) {
  productByHandle(handle: $handle) {
    id
    title
    description
    descriptionHtml
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 5) {
      edges {
        node {
          url
          altText
        }
      }
    }
    variants(first: 10) {
      edges {
        node {
          id
          title
          priceV2 {
            amount
            currencyCode
          }
          availableForSale
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
}

mutation CreateCart($input: CartInput!) {
  cartCreate(input: $input) {
    cart {
      id
      checkoutUrl
      lines(first: 10) {
        edges {
          node {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                id
                title
                priceV2 {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
      cost {
        totalAmount {
          amount
          currencyCode
        }
      }
    }
  }
}
```

## Type-Safe SDK Usage

### Auto-Generated SDKs

For each external service, nitro-graphql generates:

1. **Types**: `#graphql/client/{serviceName}` - All GraphQL types
2. **SDK**: `${serviceName}Sdk` - Type-safe query/mutation functions
3. **Client**: Auto-configured with endpoint and headers

### Using Multiple Services

```typescript
import type { GetCountriesQuery } from '#graphql/client/countries'
// In a Nuxt component or composable
import type { GetViewerQuery } from '#graphql/client/github'
import type { GetProductsQuery } from '#graphql/client/shopify'

// Fetch from GitHub
const { data: githubData } = await $githubSdk.GetViewer()

// Fetch from Countries
const { data: countriesData } = await $countriesSdk.GetCountries()

// Fetch from Shopify
const { data: shopifyData } = await $shopifySdk.GetProducts({ first: 10 })
```

## Advanced Configuration

### Custom Paths for External Services

```typescript
export default defineNuxtConfig({
  nitro: {
    graphql: {
      externalServices: [
        {
          name: 'github',
          schema: 'https://api.github.com/graphql',
          endpoint: 'https://api.github.com/graphql',

          // Custom paths for this service
          paths: {
            sdk: 'app/utils/github-sdk.ts',
            types: 'types/github.d.ts',
            ofetch: 'app/utils/github-client.ts',
          },
        },
      ],
    },
  },
})
```

### Dynamic Headers

```typescript
externalServices: [
  {
    name: 'api',
    endpoint: 'https://api.example.com/graphql',
    headers: () => {
      // Access runtime config
      const config = useRuntimeConfig()

      // Dynamic headers based on environment
      return {
        'Authorization': `Bearer ${config.apiToken}`,
        'X-Custom-Header': config.customValue,
      }
    },
  },
]
```

### Local Schema Files

```typescript
externalServices: [
  {
    name: 'legacy-api',
    // Use local schema file instead of downloading
    schema: './schemas/legacy-api.graphql',
    endpoint: 'https://legacy.example.com/graphql',
    downloadSchema: false,
  },
]
```

## Error Handling

### Service-Specific Error Handling

```typescript
export function useGitHub() {
  const handleError = (err: unknown) => {
    if (err instanceof Error) {
      // GitHub-specific error handling
      if (err.message.includes('401')) {
        return 'GitHub authentication failed. Check your token.'
      }
      if (err.message.includes('rate limit')) {
        return 'GitHub rate limit exceeded. Please try again later.'
      }
      return err.message
    }
    return 'An unknown error occurred'
  }

  const fetchViewer = async () => {
    try {
      const { data } = await $githubSdk.GetViewer()
      return data?.viewer
    }
    catch (err) {
      const message = handleError(err)
      console.error('GitHub error:', message)
      throw new Error(message)
    }
  }

  return { fetchViewer }
}
```

## Testing External Services

### Mock External Responses

```typescript
// tests/mocks/github.ts
export const mockGitHubViewer = {
  viewer: {
    login: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    bio: 'Test bio',
    avatarUrl: 'https://avatars.example.com/test',
    url: 'https://github.com/testuser',
    followers: { totalCount: 100 },
    repositories: {
      totalCount: 50,
      nodes: [
        {
          id: '1',
          name: 'test-repo',
          description: 'Test repository',
          url: 'https://github.com/testuser/test-repo',
          stargazerCount: 10,
          forkCount: 5,
          primaryLanguage: {
            name: 'TypeScript',
            color: '#3178c6',
          },
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
    },
  },
}
```

## Benefits

1. **Type Safety**: Full TypeScript types for external APIs
2. **Auto-completion**: IDE support for all queries and types
3. **Single Source of Truth**: Schema as the contract
4. **Easy Updates**: Re-download schema to get latest changes
5. **Multiple Services**: Integrate any number of GraphQL APIs
6. **Custom Authentication**: Flexible header configuration

## Popular External GraphQL APIs

- **GitHub**: https://docs.github.com/en/graphql
- **Shopify**: https://shopify.dev/docs/api/storefront
- **Contentful**: https://www.contentful.com/developers/docs/references/graphql/
- **Hygraph (GraphCMS)**: https://hygraph.com/docs/api-reference
- **Countries**: https://countries.trevorblades.com
- **SpaceX**: https://api.spacex.land/graphql/
- **Rick and Morty**: https://rickandmortyapi.com/graphql

## Related Examples

- [Basic Nitro Server](./nitro-basic.md) - Internal GraphQL API
- [Full-stack Nuxt App](./nuxt-fullstack.md) - Complete Nuxt setup
- [Apollo Federation](./federation-subgraph.md) - Federated services

## Playground Reference

This example is based on the external services configuration in the [Nuxt Playground](https://github.com/your-repo/nitro-graphql/tree/main/playgrounds/nuxt) in the nitro-graphql repository.
