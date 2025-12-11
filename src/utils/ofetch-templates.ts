/**
 * Shared ofetch template generation utilities
 * Used by both main client and external service code generation
 */

export interface OfetchTemplateOptions {
  /** Service name (e.g., 'default', 'github') */
  serviceName: string
  /** Whether to use Nuxt composables ($fetch, useRequestHeaders) */
  isNuxt: boolean
  /** Endpoint URL for the GraphQL service */
  endpoint: string
  /** Whether this is an external service (affects naming convention) */
  isExternal?: boolean
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Generate ofetch client template content
 *
 * For main (default) service:
 * - SDK exported as `$sdk`
 * - Client function is `createGraphQLClient`
 *
 * For external services:
 * - SDK exported as `$${serviceName}Sdk`
 * - Client function is `create${ServiceName}GraphQLClient`
 * - Endpoint has default value
 */
export function generateOfetchTemplate(options: OfetchTemplateOptions): string {
  const { serviceName, isNuxt, endpoint, isExternal = false } = options

  if (isExternal) {
    return generateExternalOfetchTemplate({ serviceName, isNuxt, endpoint })
  }

  return generateMainOfetchTemplate({ isNuxt, endpoint })
}

/**
 * Generate ofetch template for main (default) GraphQL service
 */
function generateMainOfetchTemplate(options: { isNuxt: boolean, endpoint: string }): string {
  const { isNuxt, endpoint } = options

  if (isNuxt) {
    return `// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
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

export const $sdk = getSdk(createGraphQLClient('${endpoint}'))`
  }

  return `// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
import type { Requester } from './sdk'
import { ofetch } from 'ofetch'
import { getSdk } from './sdk'

export function createGraphQLClient(endpoint: string): Requester {
  return async <R>(doc: string, vars?: any): Promise<R> => {
    const result = await ofetch(endpoint, {
      method: 'POST',
      body: { query: doc, variables: vars },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return result as R
  }
}

export const $sdk = getSdk(createGraphQLClient('${endpoint}'))`
}

/**
 * Generate ofetch template for external GraphQL service
 */
function generateExternalOfetchTemplate(options: { serviceName: string, isNuxt: boolean, endpoint: string }): string {
  const { serviceName, isNuxt, endpoint } = options
  const capitalizedName = capitalize(serviceName)

  if (isNuxt) {
    return `// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
import type { Sdk, Requester } from './sdk'
import { getSdk } from './sdk'

export function create${capitalizedName}GraphQLClient(endpoint: string = '${endpoint}'): Requester {
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

export const $${serviceName}Sdk: Sdk = getSdk(create${capitalizedName}GraphQLClient())`
  }

  return `// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
import type { Sdk, Requester } from './sdk'
import { ofetch } from 'ofetch'
import { getSdk } from './sdk'

export function create${capitalizedName}GraphQLClient(endpoint: string = '${endpoint}'): Requester {
  return async <R>(doc: string, vars?: any): Promise<R> => {
    const result = await ofetch(endpoint, {
      method: 'POST',
      body: { query: doc, variables: vars },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return result as R
  }
}

export const $${serviceName}Sdk: Sdk = getSdk(create${capitalizedName}GraphQLClient())`
}

export interface WebSocketTemplateOptions {
  /** Service name (e.g., 'default', 'github') */
  serviceName: string
  /** WebSocket endpoint URL */
  wsEndpoint: string
  /** Whether this is an external service */
  isExternal?: boolean
}

/**
 * Generate WebSocket client template for GraphQL subscriptions
 */
export function generateWebSocketTemplate(options: WebSocketTemplateOptions): string {
  const { serviceName, wsEndpoint, isExternal = false } = options
  const capitalizedName = capitalize(serviceName)
  const serviceDescription = isExternal ? `${serviceName} external service` : (serviceName === 'default' ? 'the main GraphQL service' : serviceName)
  const serviceLogName = isExternal ? serviceName : (serviceName === 'default' ? 'main service' : serviceName)

  return `// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
import { createClient } from 'graphql-ws'

export interface WebSocketClientConfig {
  url?: string
  headers?: Record<string, string> | (() => Record<string, string>)
  retryAttempts?: number
  retryWait?: number | ((retries: number) => number)
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

/**
 * Create a GraphQL WebSocket client for ${serviceDescription}
 * Uses graphql-ws protocol for subscriptions
 */
export function create${capitalizedName}WebSocketClient(config: WebSocketClientConfig = {}) {
  const {
    url = typeof window !== 'undefined'
      ? \`\${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}/\${window.location.host}${wsEndpoint}\`
      : '${wsEndpoint}',
    headers,
    retryAttempts = 5,
    retryWait,
    onConnected,
    onDisconnected,
    onError,
  } = config

  const client = createClient({
    url,
    connectionParams: () => {
      const resolvedHeaders = typeof headers === 'function' ? headers() : headers
      return resolvedHeaders || {}
    },
    retryAttempts,
    retryWait,
    on: {
      connected: () => {
        console.log('[GraphQL WS] Connected to ${serviceLogName}')
        onConnected?.()
      },
      closed: () => {
        console.log('[GraphQL WS] Disconnected from ${serviceLogName}')
        onDisconnected?.()
      },
      error: (error) => {
        console.error('[GraphQL WS] Error:', error)
        onError?.(error as Error)
      },
    },
  })

  return client
}

/**
 * Helper to execute a GraphQL subscription
 *
 * @example
 * const unsubscribe = executeSubscription(client, {
 *   query: \`subscription { messageSent { id text } }\`,
 *   onData: (data) => console.log('Message:', data.messageSent),
 *   onError: (error) => console.error('Error:', error)
 * })
 */
export function executeSubscription<T = any>(
  client: ReturnType<typeof create${capitalizedName}WebSocketClient>,
  options: {
    query: string
    variables?: Record<string, any>
    operationName?: string
    onData: (data: T) => void
    onError?: (error: Error) => void
    onComplete?: () => void
  },
) {
  const { query, variables, operationName, onData, onError, onComplete } = options

  const unsubscribe = client.subscribe(
    {
      query,
      variables,
      operationName,
    },
    {
      next: (result) => {
        if (result.errors) {
          onError?.(new Error(result.errors.map(e => e.message).join(', ')))
        }
        else if (result.data) {
          onData(result.data as T)
        }
      },
      error: (error) => {
        onError?.(error instanceof Error ? error : new Error(String(error)))
      },
      complete: () => {
        onComplete?.()
      },
    },
  )

  return unsubscribe
}

// Export a default client instance for ${serviceLogName}
export const $wsClient = create${capitalizedName}WebSocketClient()
`
}
