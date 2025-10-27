# External API Integration

Complete guide to integrating external REST APIs and GraphQL services with Nitro GraphQL.

## Overview

This recipe covers:
- Fetching data from REST APIs in resolvers
- Integrating external GraphQL services
- Error handling and retry logic
- Caching external API responses
- Rate limiting external API calls
- Authentication with external services

## REST API Integration

### 1. Setup HTTP Client

Create `server/utils/http-client.ts`:

```typescript
import { ofetch } from 'ofetch'

export const httpClient = ofetch.create({
  retry: 3,
  retryDelay: 1000,
  timeout: 10000,
  onRequestError({ error }) {
    console.error('Request error:', error)
  },
  onResponseError({ response }) {
    console.error('Response error:', response.status, response.statusText)
  },
})

// Create clients for specific services
export const githubClient = ofetch.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  },
})

export const weatherClient = ofetch.create({
  baseURL: 'https://api.openweathermap.org/data/2.5',
  params: {
    appid: process.env.WEATHER_API_KEY,
  },
})
```

### 2. GitHub API Integration Example

Create `server/graphql/github/github.graphql`:

```graphql
type GitHubUser {
  login: String!
  id: Int!
  avatarUrl: String!
  name: String
  bio: String
  publicRepos: Int!
  followers: Int!
  following: Int!
  createdAt: DateTime!
}

type GitHubRepository {
  id: Int!
  name: String!
  fullName: String!
  description: String
  url: String!
  stars: Int!
  forks: Int!
  language: String
  openIssues: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

extend type Query {
  """Get GitHub user by username"""
  githubUser(username: String!): GitHubUser

  """Get GitHub repositories for a user"""
  githubRepos(username: String!, limit: Int = 10): [GitHubRepository!]!

  """Search GitHub repositories"""
  searchGithubRepos(query: String!, limit: Int = 10): [GitHubRepository!]!
}
```

Create `server/graphql/github/github.resolver.ts`:

```typescript
import { GraphQLError } from 'graphql'
import { githubClient } from '../../utils/http-client'

interface GitHubUserResponse {
  login: string
  id: number
  avatar_url: string
  name: string
  bio: string
  public_repos: number
  followers: number
  following: number
  created_at: string
}

interface GitHubRepoResponse {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  stargazers_count: number
  forks_count: number
  language: string
  open_issues_count: number
  created_at: string
  updated_at: string
}

export const githubResolvers = defineResolver({
  Query: {
    githubUser: async (_parent, { username }) => {
      try {
        const data = await githubClient<GitHubUserResponse>(`/users/${username}`)

        return {
          login: data.login,
          id: data.id,
          avatarUrl: data.avatar_url,
          name: data.name,
          bio: data.bio,
          publicRepos: data.public_repos,
          followers: data.followers,
          following: data.following,
          createdAt: new Date(data.created_at),
        }
      }
      catch (error: any) {
        if (error.response?.status === 404) {
          throw new GraphQLError(`GitHub user '${username}' not found`, {
            extensions: { code: 'NOT_FOUND' },
          })
        }
        throw new GraphQLError('Failed to fetch GitHub user', {
          extensions: {
            code: 'EXTERNAL_API_ERROR',
            originalError: error.message,
          },
        })
      }
    },

    githubRepos: async (_parent, { username, limit }) => {
      try {
        const data = await githubClient<GitHubRepoResponse[]>(
          `/users/${username}/repos`,
          {
            params: {
              sort: 'updated',
              per_page: limit,
            },
          }
        )

        return data.map(repo => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          openIssues: repo.open_issues_count,
          createdAt: new Date(repo.created_at),
          updatedAt: new Date(repo.updated_at),
        }))
      }
      catch (error: any) {
        throw new GraphQLError('Failed to fetch GitHub repositories', {
          extensions: {
            code: 'EXTERNAL_API_ERROR',
            originalError: error.message,
          },
        })
      }
    },

    searchGithubRepos: async (_parent, { query, limit }) => {
      try {
        const data = await githubClient<{ items: GitHubRepoResponse[] }>(
          '/search/repositories',
          {
            params: {
              q: query,
              sort: 'stars',
              order: 'desc',
              per_page: limit,
            },
          }
        )

        return data.items.map(repo => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          openIssues: repo.open_issues_count,
          createdAt: new Date(repo.created_at),
          updatedAt: new Date(repo.updated_at),
        }))
      }
      catch (error: any) {
        throw new GraphQLError('Failed to search GitHub repositories', {
          extensions: {
            code: 'EXTERNAL_API_ERROR',
            originalError: error.message,
          },
        })
      }
    },
  },
})
```

### 3. Weather API Integration Example

Create `server/graphql/weather/weather.graphql`:

```graphql
type Weather {
  city: String!
  country: String!
  temperature: Float!
  feelsLike: Float!
  description: String!
  humidity: Int!
  windSpeed: Float!
  icon: String!
}

extend type Query {
  """Get current weather for a city"""
  weather(city: String!): Weather!

  """Get weather forecast for 5 days"""
  weatherForecast(city: String!): [Weather!]!
}
```

Create `server/graphql/weather/weather.resolver.ts`:

```typescript
import { GraphQLError } from 'graphql'
import { weatherClient } from '../../utils/http-client'

interface WeatherResponse {
  name: string
  sys: { country: string }
  main: {
    temp: number
    feels_like: number
    humidity: number
  }
  weather: Array<{
    description: string
    icon: string
  }>
  wind: { speed: number }
}

export const weatherResolvers = defineResolver({
  Query: {
    weather: async (_parent, { city }) => {
      try {
        const data = await weatherClient<WeatherResponse>('/weather', {
          params: { q: city, units: 'metric' },
        })

        return {
          city: data.name,
          country: data.sys.country,
          temperature: data.main.temp,
          feelsLike: data.main.feels_like,
          description: data.weather[0].description,
          humidity: data.main.humidity,
          windSpeed: data.wind.speed,
          icon: data.weather[0].icon,
        }
      }
      catch (error: any) {
        if (error.response?.status === 404) {
          throw new GraphQLError(`City '${city}' not found`, {
            extensions: { code: 'NOT_FOUND' },
          })
        }
        throw new GraphQLError('Failed to fetch weather data', {
          extensions: {
            code: 'EXTERNAL_API_ERROR',
            originalError: error.message,
          },
        })
      }
    },
  },
})
```

## External GraphQL Service Integration

Nitro GraphQL supports external GraphQL services out of the box!

### 1. Configure External Service

Update `nuxt.config.ts` or `nitro.config.ts`:

```typescript
export default defineNuxtConfig({
  nitro: {
    graphql: {
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
        {
          name: 'spacex',
          schema: 'https://spacex-production.up.railway.app',
          endpoint: 'https://spacex-production.up.railway.app',
          documents: ['app/graphql/spacex/**/*.graphql'],
        },
      ],
    },
  },
})
```

### 2. Create Client Queries

Create `app/graphql/github/queries.graphql`:

```graphql
query GitHubViewer {
  viewer {
    login
    name
    email
    avatarUrl
    repositories(first: 10) {
      nodes {
        name
        description
        stargazerCount
      }
    }
  }
}

query GitHubRepo($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    name
    description
    stargazerCount
    forkCount
    issues(first: 5, states: OPEN) {
      nodes {
        title
        createdAt
      }
    }
  }
}
```

### 3. Use in Components

```vue
<template>
  <div>
    <h2>{{ viewer?.name }}</h2>
    <div v-for="repo in viewer?.repositories.nodes" :key="repo.name">
      <h3>{{ repo.name }}</h3>
      <p>⭐ {{ repo.stargazerCount }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: viewer } = await useGraphQL('GitHubViewer', {}, {
  service: 'github',
})
</script>
```

## Advanced Patterns

### 1. Retry Logic with Exponential Backoff

Create `server/utils/retry.ts`:

```typescript
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    }
    catch (error) {
      if (attempt === maxRetries - 1) {
        throw error
      }

      const delay = baseDelay * 2 ** attempt
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error('Max retries exceeded')
}
```

Usage:

```typescript
const data = await retryWithBackoff(
  () => githubClient<GitHubUserResponse>(`/users/${username}`),
  3,
  1000
)
```

### 2. Circuit Breaker Pattern

Create `server/utils/circuit-breaker.ts`:

```typescript
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private threshold = 5,
    private timeout = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN'
      }
      else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    }
    catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.threshold) {
      this.state = 'OPEN'
    }
  }
}

// Usage
const githubBreaker = new CircuitBreaker(5, 60000)

export async function fetchGitHubUser(username: string) {
  return await githubBreaker.execute(() =>
    githubClient(`/users/${username}`)
  )
}
```

### 3. Request Batching

Create `server/utils/batch-loader.ts`:

```typescript
export class BatchLoader<K, V> {
  private queue: Array<{
    key: K
    resolve: (value: V) => void
    reject: (error: Error) => void
  }> = []

  private timer: NodeJS.Timeout | null = null

  constructor(
    private batchFn: (keys: K[]) => Promise<V[]>,
    private delay = 10
  ) {}

  load(key: K): Promise<V> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject })

      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.delay)
      }
    })
  }

  private async flush() {
    const queue = this.queue
    this.queue = []
    this.timer = null

    try {
      const keys = queue.map(item => item.key)
      const results = await this.batchFn(keys)

      queue.forEach((item, index) => {
        item.resolve(results[index])
      })
    }
    catch (error) {
      queue.forEach((item) => {
        item.reject(error as Error)
      })
    }
  }
}

// Usage
const userLoader = new BatchLoader(async (userIds: string[]) => {
  const users = await githubClient<GitHubUserResponse[]>('/users', {
    params: { ids: userIds.join(',') },
  })
  return users
})

// In resolver
const user = await userLoader.load(userId)
```

## Caching External API Responses

### 1. Redis Cache

Create `server/utils/cache.ts`:

```typescript
import redis from './redis'

export async function cacheResponse<T>(
  key: string,
  fn: () => Promise<T>,
  ttl = 3600
): Promise<T> {
  // Try to get from cache
  const cached = await redis.get(key)
  if (cached) {
    return JSON.parse(cached)
  }

  // Fetch fresh data
  const data = await fn()

  // Cache the result
  await redis.setex(key, ttl, JSON.stringify(data))

  return data
}
```

Usage:

```typescript
const user = await cacheResponse(
  `github:user:${username}`,
  () => githubClient<GitHubUserResponse>(`/users/${username}`),
  3600 // 1 hour
)
```

### 2. In-Memory LRU Cache

```typescript
import { LRUCache } from 'lru-cache'

const cache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
})

export async function cachedFetch<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key)
  if (cached) {
    return cached
  }

  const data = await fn()
  cache.set(key, data)
  return data
}
```

## Error Handling Best Practices

### 1. Typed Error Responses

```typescript
interface APIError {
  code: string
  message: string
  statusCode: number
}

function handleAPIError(error: any): GraphQLError {
  const apiError: APIError = {
    code: 'EXTERNAL_API_ERROR',
    message: error.message || 'Unknown error',
    statusCode: error.response?.status || 500,
  }

  if (error.response?.status === 404) {
    apiError.code = 'NOT_FOUND'
  }
  else if (error.response?.status === 429) {
    apiError.code = 'RATE_LIMIT_EXCEEDED'
  }
  else if (error.response?.status === 401) {
    apiError.code = 'UNAUTHORIZED'
  }

  return new GraphQLError(apiError.message, {
    extensions: {
      code: apiError.code,
      statusCode: apiError.statusCode,
    },
  })
}
```

### 2. Graceful Degradation

```typescript
async function githubRepos(_parent, { username }) {
  try {
    return await fetchGitHubRepos(username)
  }
  catch (error) {
    console.error('GitHub API error:', error)

    // Return cached data or empty array
    const cached = await getCachedRepos(username)
    return cached || []
  }
}
```

## Rate Limiting External APIs

```typescript
import Bottleneck from 'bottleneck'

// Create limiter for GitHub API (5000 requests/hour)
const githubLimiter = new Bottleneck({
  reservoir: 5000,
  reservoirRefreshAmount: 5000,
  reservoirRefreshInterval: 60 * 60 * 1000, // 1 hour
  maxConcurrent: 10,
})

export const rateLimitedGithubClient = githubLimiter.wrap(githubClient)
```

## Testing External API Integration

```typescript
import { describe, expect, it, vi } from 'vitest'
import { githubResolvers } from '../github.resolver'

// Mock the HTTP client
vi.mock('../../utils/http-client', () => ({
  githubClient: vi.fn(),
}))

describe('GitHub Integration', () => {
  it('should fetch GitHub user', async () => {
    const mockUser = {
      login: 'testuser',
      id: 123,
      avatar_url: 'https://example.com/avatar.jpg',
      name: 'Test User',
    }

    githubClient.mockResolvedValue(mockUser)

    const result = await githubResolvers.Query.githubUser(
      null,
      { username: 'testuser' },
      {}
    )

    expect(result.login).toBe('testuser')
  })
})
```

## Best Practices

### 1. Use Environment Variables

Store API keys securely:

```env
GITHUB_TOKEN=your_token_here
WEATHER_API_KEY=your_key_here
```

### 2. Implement Timeouts

Always set timeouts for external requests:

```typescript
const client = ofetch.create({
  timeout: 10000, // 10 seconds
})
```

### 3. Monitor API Usage

Track API calls and errors:

```typescript
const apiMetrics = {
  totalCalls: 0,
  errors: 0,
  avgResponseTime: 0,
}

async function trackAPICall<T>(fn: () => Promise<T>): Promise<T> {
  const start = Date.now()
  apiMetrics.totalCalls++

  try {
    const result = await fn()
    apiMetrics.avgResponseTime
      = (apiMetrics.avgResponseTime + (Date.now() - start)) / 2
    return result
  }
  catch (error) {
    apiMetrics.errors++
    throw error
  }
}
```

## Related Recipes

- [Caching Strategies](./caching-strategies.md) - Caching external API responses
- [Rate Limiting](./rate-limiting.md) - Protecting your API
- [Error Handling](../guide/error-handling.md) - Proper error responses

## Playground Example

See external service integration in:
- Config: `playgrounds/nuxt/nuxt.config.ts`
- Queries: `playgrounds/nuxt/app/graphql/countries/*.graphql`

## References

- [External Services Guide](../guide/external-services.md)
- [ofetch Documentation](https://github.com/unjs/ofetch)
