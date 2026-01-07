/**
 * GraphQL Subscription Client
 * Lightweight wrapper around graphql-ws and graphql-sse
 *
 * @example WebSocket (default - uses graphql-ws)
 * ```typescript
 * import { createSubscriptionClient } from 'nitro-graphql/subscribe'
 *
 * const client = createSubscriptionClient({ wsEndpoint: '/api/graphql/ws' })
 *
 * // Simple subscription
 * const handle = client.subscribe(
 *   'subscription { countdown(from: 10) }',
 *   {},
 *   (data) => console.log(data),
 *   (error) => console.error(error)
 * )
 *
 * // Unsubscribe
 * handle.unsubscribe()
 * ```
 *
 * @example SSE Transport (uses graphql-sse)
 * ```typescript
 * client.subscribe(query, vars, onData, onError, { transport: 'sse' })
 * ```
 *
 * @example Auto Transport (WebSocket first, SSE fallback)
 * ```typescript
 * client.subscribe(query, vars, onData, onError, { transport: 'auto' })
 * ```
 *
 * @module nitro-graphql/subscribe
 */

import type { Client as SseClient, ClientOptions as SseClientOptions } from 'graphql-sse'
import type { Client as WsClient, ClientOptions as WsClientOptions } from 'graphql-ws'
import { createClient as createSseClient } from 'graphql-sse'
import { createClient as createWsClient } from 'graphql-ws'

// ============================================================================
// Types
// ============================================================================

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'
export type SubscriptionTransport = 'websocket' | 'sse' | 'auto'

export interface TransportOptions {
  /** Transport type: 'websocket' (default), 'sse', or 'auto' (WS first, SSE fallback) */
  transport?: SubscriptionTransport
}

export interface SubscriptionHandle {
  unsubscribe: () => void
  readonly transport: 'websocket' | 'sse'
}

export interface SubscriptionSession {
  subscribe: <TData = unknown, TVariables = Record<string, unknown>>(
    query: string,
    variables?: TVariables,
    onData?: (data: TData) => void,
    onError?: (error: Error) => void,
  ) => SubscriptionHandle
  readonly isConnected: boolean
  readonly state: ConnectionState
  readonly subscriptionCount: number
  close: () => void
  onStateChange: (callback: StateChangeCallback) => () => void
}

export type StateChangeCallback = (state: ConnectionState, subscriptionCount: number) => void

export interface SubscriptionClientConfig {
  /** WebSocket endpoint (default: '/api/graphql/ws') */
  wsEndpoint?: string
  /** SSE endpoint for SSE transport (default: '/api/graphql') */
  sseEndpoint?: string
  /** Connection parameters for WebSocket handshake */
  connectionParams?: Record<string, unknown> | (() => Record<string, unknown> | Promise<Record<string, unknown>>)
  /** Headers for SSE requests */
  sseHeaders?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>)
  /** Connection timeout in ms (default: 10000) */
  connectionTimeoutMs?: number
  /** Maximum retry attempts (default: 5) */
  maxRetries?: number
  /** Keep-alive ping interval in ms (default: 25000) */
  keepAlive?: number
}

export interface SubscriptionClient {
  subscribe: <TData = unknown, TVariables = Record<string, unknown>>(
    query: string,
    variables?: TVariables,
    onData?: (data: TData) => void,
    onError?: (error: Error) => void,
    transportOptions?: TransportOptions,
  ) => SubscriptionHandle
  createSession: () => SubscriptionSession
  dispose: () => void
}

// ============================================================================
// Utilities
// ============================================================================

function toWebSocketUrl(httpUrl: string): string {
  if (httpUrl.startsWith('/')) {
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost'
    return `${protocol}//${host}${httpUrl}`
  }
  return httpUrl.replace(/^http/, 'ws')
}

function toHttpUrl(url: string): string {
  if (url.startsWith('/')) {
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:'
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost'
    return `${protocol}//${host}${url}`
  }
  return url
}

function extractDataValue<T>(data: Record<string, unknown> | undefined): T | undefined {
  if (!data)
    return undefined
  const values = Object.values(data)
  return values[0] as T | undefined
}

// ============================================================================
// SSE Subscription (graphql-sse powered)
// ============================================================================

function createSseSubscriptionInternal<TData = unknown>(
  client: SseClient,
  query: string,
  variables: unknown,
  onData?: (data: TData) => void,
  onError?: (error: Error) => void,
): SubscriptionHandle {
  const unsubscribe = client.subscribe<{ data?: Record<string, unknown>, errors?: Array<{ message: string }> }>(
    { query, variables: variables as Record<string, unknown> },
    {
      next: (result) => {
        if (result.errors?.length) {
          onError?.(new Error(result.errors[0]?.message || 'GraphQL Error'))
        }
        else if (result.data) {
          const value = extractDataValue<TData>(result.data)
          if (value !== undefined) {
            onData?.(value)
          }
        }
      },
      error: (err) => {
        onError?.(err instanceof Error ? err : new Error(String(err)))
      },
      complete: () => {
        // Subscription completed
      },
    },
  )

  return {
    unsubscribe,
    transport: 'sse' as const,
  }
}

// ============================================================================
// WebSocket Subscription (graphql-ws powered)
// ============================================================================

function createWsSubscriptionInternal<TData = unknown>(
  client: WsClient,
  query: string,
  variables: unknown,
  onData?: (data: TData) => void,
  onError?: (error: Error) => void,
): SubscriptionHandle {
  const unsubscribe = client.subscribe<{ data?: Record<string, unknown>, errors?: Array<{ message: string }> }>(
    { query, variables: variables as Record<string, unknown> },
    {
      next: (result) => {
        if (result.errors?.length) {
          onError?.(new Error(result.errors[0]?.message || 'GraphQL Error'))
        }
        else if (result.data) {
          const value = extractDataValue<TData>(result.data)
          if (value !== undefined) {
            onData?.(value)
          }
        }
      },
      error: (err) => {
        onError?.(err instanceof Error ? err : new Error(String(err)))
      },
      complete: () => {
        // Subscription completed
      },
    },
  )

  return {
    unsubscribe,
    transport: 'websocket' as const,
  }
}

// ============================================================================
// Auto Transport (WebSocket first, SSE fallback)
// ============================================================================

function createAutoSubscription<TData = unknown>(
  wsClient: WsClient,
  sseClient: SseClient,
  query: string,
  variables: unknown,
  onData?: (data: TData) => void,
  onError?: (error: Error) => void,
  timeoutMs: number = 5000,
): SubscriptionHandle {
  let activeHandle: SubscriptionHandle | null = null
  let fallbackTimeout: ReturnType<typeof setTimeout> | null = null
  let wsConnected = false

  // Try WebSocket first
  const wsUnsubscribe = wsClient.subscribe<{ data?: Record<string, unknown>, errors?: Array<{ message: string }> }>(
    { query, variables: variables as Record<string, unknown> },
    {
      next: (result) => {
        wsConnected = true
        if (fallbackTimeout) {
          clearTimeout(fallbackTimeout)
          fallbackTimeout = null
        }
        if (result.errors?.length) {
          onError?.(new Error(result.errors[0]?.message || 'GraphQL Error'))
        }
        else if (result.data) {
          const value = extractDataValue<TData>(result.data)
          if (value !== undefined) {
            onData?.(value)
          }
        }
      },
      error: (err) => {
        // If WS fails before connecting, fallback to SSE
        if (!wsConnected) {
          activeHandle = createSseSubscriptionInternal(sseClient, query, variables, onData, onError)
        }
        else {
          onError?.(err instanceof Error ? err : new Error(String(err)))
        }
      },
      complete: () => {},
    },
  )

  // Set fallback timeout
  fallbackTimeout = setTimeout(() => {
    if (!wsConnected) {
      wsUnsubscribe()
      activeHandle = createSseSubscriptionInternal(sseClient, query, variables, onData, onError)
    }
  }, timeoutMs)

  return {
    unsubscribe: () => {
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout)
      }
      if (activeHandle) {
        activeHandle.unsubscribe()
      }
      else {
        wsUnsubscribe()
      }
    },
    get transport() {
      return activeHandle?.transport ?? 'websocket'
    },
  }
}

// ============================================================================
// Session (multiplexed subscriptions over single connection)
// ============================================================================

function createSessionInternal(client: WsClient): SubscriptionSession {
  const subscriptions = new Map<string, () => void>()
  const stateListeners = new Set<StateChangeCallback>()
  let idCounter = 0
  let state: ConnectionState = 'idle'

  function setState(newState: ConnectionState) {
    state = newState
    notifyListeners()
  }

  function notifyListeners() {
    for (const listener of stateListeners) {
      listener(state, subscriptions.size)
    }
  }

  // graphql-ws handles connection state internally
  // We track it through subscription lifecycle
  setState('connected')

  return {
    subscribe<TData = unknown, TVariables = Record<string, unknown>>(
      query: string,
      variables?: TVariables,
      onData?: (data: TData) => void,
      onError?: (error: Error) => void,
    ): SubscriptionHandle {
      const id = String(++idCounter)

      const unsubscribe = client.subscribe<{ data?: Record<string, unknown>, errors?: Array<{ message: string }> }>(
        { query, variables: variables as Record<string, unknown> },
        {
          next: (result) => {
            if (result.errors?.length) {
              onError?.(new Error(result.errors[0]?.message || 'GraphQL Error'))
            }
            else if (result.data) {
              const value = extractDataValue<TData>(result.data)
              if (value !== undefined) {
                onData?.(value)
              }
            }
          },
          error: (err) => {
            onError?.(err instanceof Error ? err : new Error(String(err)))
            subscriptions.delete(id)
            notifyListeners()
          },
          complete: () => {
            subscriptions.delete(id)
            notifyListeners()
          },
        },
      )

      subscriptions.set(id, unsubscribe)
      notifyListeners()

      return {
        unsubscribe: () => {
          unsubscribe()
          subscriptions.delete(id)
          notifyListeners()
        },
        transport: 'websocket' as const,
      }
    },

    get isConnected() {
      return state === 'connected'
    },

    get state() {
      return state
    },

    get subscriptionCount() {
      return subscriptions.size
    },

    close() {
      for (const unsubscribe of subscriptions.values()) {
        unsubscribe()
      }
      subscriptions.clear()
      setState('disconnected')
    },

    onStateChange(callback: StateChangeCallback) {
      stateListeners.add(callback)
      return () => stateListeners.delete(callback)
    },
  }
}

// ============================================================================
// Subscription Client Factory
// ============================================================================

export function createSubscriptionClient(config: SubscriptionClientConfig = {}): SubscriptionClient {
  const wsEndpoint = config.wsEndpoint ?? '/api/graphql/ws'
  const sseEndpoint = config.sseEndpoint ?? '/api/graphql'
  const connectionTimeoutMs = config.connectionTimeoutMs ?? 10000
  const maxRetries = config.maxRetries ?? 5
  const keepAlive = config.keepAlive ?? 25000

  // Create graphql-ws client (WebSocket)
  const wsClientOptions: WsClientOptions = {
    url: toWebSocketUrl(wsEndpoint),
    retryAttempts: maxRetries,
    keepAlive,
    connectionAckWaitTimeout: connectionTimeoutMs,
    connectionParams: config.connectionParams,
  }
  const wsClient = createWsClient(wsClientOptions)

  // Create graphql-sse client (SSE)
  const sseClientOptions: SseClientOptions = {
    url: toHttpUrl(sseEndpoint),
    retryAttempts: maxRetries,
    headers: config.sseHeaders,
  }
  const sseClient = createSseClient(sseClientOptions)

  return {
    subscribe<TData = unknown, TVariables = Record<string, unknown>>(
      query: string,
      variables?: TVariables,
      onData?: (data: TData) => void,
      onError?: (error: Error) => void,
      transportOptions?: TransportOptions,
    ): SubscriptionHandle {
      const transport = transportOptions?.transport ?? 'websocket'

      if (transport === 'sse') {
        return createSseSubscriptionInternal(sseClient, query, variables, onData, onError)
      }

      if (transport === 'auto') {
        return createAutoSubscription(wsClient, sseClient, query, variables, onData, onError, connectionTimeoutMs)
      }

      // Default: WebSocket
      return createWsSubscriptionInternal(wsClient, query, variables, onData, onError)
    },

    createSession(): SubscriptionSession {
      return createSessionInternal(wsClient)
    },

    dispose() {
      wsClient.dispose()
      sseClient.dispose()
    },
  }
}
