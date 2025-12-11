/**
 * GraphQL Subscription Client
 * Framework-agnostic subscription client supporting WebSocket and SSE transports
 *
 * Uses native browser WebSocket API and EventSource for maximum compatibility.
 *
 * @example WebSocket (default)
 * ```typescript
 * import { createSubscriptionClient } from 'nitro-graphql/subscribe'
 *
 * const client = createSubscriptionClient({ wsEndpoint: '/api/graphql/ws' })
 *
 * // Simple subscription
 * client.subscribe(
 *   'subscription { countdown(from: 10) }',
 *   {},
 *   (data) => console.log(data),
 *   (error) => console.error(error)
 * )
 *
 * // Multiplexed session (multiple subscriptions, single connection)
 * const session = client.createSession()
 * session.subscribe(query1, vars1, onData1)
 * session.subscribe(query2, vars2, onData2)
 * ```
 *
 * @example SSE Transport (same API, different transport)
 * ```typescript
 * // Use SSE when WebSocket is blocked (corporate firewalls, etc.)
 * client.subscribe(
 *   'subscription { countdown(from: 10) }',
 *   {},
 *   (data) => console.log(data),
 *   (error) => console.error(error),
 *   { transport: 'sse' }
 * )
 * ```
 *
 * @example Auto Transport (WebSocket first, SSE fallback)
 * ```typescript
 * // Automatically fallback to SSE if WebSocket fails
 * client.subscribe(
 *   'subscription { countdown(from: 10) }',
 *   {},
 *   (data) => console.log(data),
 *   (error) => console.error(error),
 *   { transport: 'auto' }
 * )
 * ```
 *
 * @module nitro-graphql/subscribe
 */

// ============================================================================
// Types
// ============================================================================

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'

/** Transport type for subscriptions */
export type SubscriptionTransport = 'websocket' | 'sse' | 'auto'

/** Transport options for subscribe calls */
export interface TransportOptions {
  /** Transport type: 'websocket' (default), 'sse', or 'auto' (WS first, SSE fallback) */
  transport?: SubscriptionTransport
  /** Shorthand for { transport: 'sse' } */
  sse?: boolean
}

export interface SubscriptionOptions<TVariables = Record<string, unknown>> {
  query: string
  variables?: TVariables
  onData?: (data: unknown) => void
  onError?: (error: Error) => void
  onConnected?: () => void
  onReconnected?: () => void
  onDisconnected?: () => void
  onRetrying?: (attempt: number, maxAttempts: number) => void
  onMaxRetriesReached?: () => void
  onStateChange?: (state: ConnectionState) => void
  maxRetries?: number
  connectionTimeoutMs?: number
  connectionParams?: Record<string, unknown>
}

export interface SubscriptionHandle {
  unsubscribe: () => void
  readonly isConnected: boolean
  readonly state: ConnectionState
  readonly id: string
  /** The active transport type */
  readonly transport: 'websocket' | 'sse'
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONNECTION_TIMEOUT_MS = 10000
const DEFAULT_MAX_RETRIES = 5
const MAX_BACKOFF_MS = 30000
const DEFAULT_PING_INTERVAL_MS = 25000
const DEFAULT_PONG_TIMEOUT_MS = 5000

// ============================================================================
// Shared Utilities
// ============================================================================

interface GraphQLWSMessage {
  id?: string
  type: string
  payload?: unknown
}

interface GraphQLPayload {
  data?: Record<string, unknown>
  errors?: Array<{ message: string }>
}

function generateSubscriptionId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  return `${timestamp}-${random}`
}

function calculateBackoffDelay(retryCount: number): number {
  const baseDelay = 1000 * 2 ** retryCount
  const cappedDelay = Math.min(baseDelay, MAX_BACKOFF_MS)
  const jitter = Math.random() * 1000
  return cappedDelay + jitter
}

function extractErrorMessage(
  errors: Array<{ message: string }> | undefined,
  fallback: string,
): string {
  return errors?.[0]?.message || fallback
}

function extractDataValue<T>(data: Record<string, unknown> | undefined): T | undefined {
  if (!data) {
    return undefined
  }
  const values = Object.values(data)
  return values[0] as T | undefined
}

function isWebSocketAvailable(): boolean {
  return typeof globalThis.WebSocket !== 'undefined'
}

function toWebSocketUrl(httpUrl: string): string {
  // Handle relative URLs
  if (httpUrl.startsWith('/')) {
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost'
    return `${protocol}//${host}${httpUrl}`
  }
  return httpUrl.replace(/^http/, 'ws')
}

function parseMessage(data: string): GraphQLWSMessage | null {
  try {
    return JSON.parse(data) as GraphQLWSMessage
  }
  catch {
    return null
  }
}

// ============================================================================
// Timer Manager
// ============================================================================

interface TimerManager {
  reconnectTimeout: ReturnType<typeof setTimeout> | null
  connectionTimeout: ReturnType<typeof setTimeout> | null
  pingInterval: ReturnType<typeof setInterval> | null
  pongTimeout: ReturnType<typeof setTimeout> | null
  clearReconnect: () => void
  clearConnection: () => void
  clearPing: () => void
  clearPong: () => void
  clearAll: () => void
}

function createTimerManager(): TimerManager {
  const manager: TimerManager = {
    reconnectTimeout: null,
    connectionTimeout: null,
    pingInterval: null,
    pongTimeout: null,

    clearReconnect() {
      if (manager.reconnectTimeout) {
        clearTimeout(manager.reconnectTimeout)
        manager.reconnectTimeout = null
      }
    },

    clearConnection() {
      if (manager.connectionTimeout) {
        clearTimeout(manager.connectionTimeout)
        manager.connectionTimeout = null
      }
    },

    clearPing() {
      if (manager.pingInterval) {
        clearInterval(manager.pingInterval)
        manager.pingInterval = null
      }
    },

    clearPong() {
      if (manager.pongTimeout) {
        clearTimeout(manager.pongTimeout)
        manager.pongTimeout = null
      }
    },

    clearAll() {
      manager.clearReconnect()
      manager.clearConnection()
      manager.clearPing()
      manager.clearPong()
    },
  }

  return manager
}

// ============================================================================
// Keep-Alive Handler
// ============================================================================

interface KeepAliveConfig {
  sendMessage: (message: GraphQLWSMessage) => void
  onPongTimeout: () => void
  isActive: () => boolean
}

function createKeepAliveHandler(config: KeepAliveConfig, timers: TimerManager) {
  function start(): void {
    stop()
    timers.pingInterval = setInterval(() => {
      if (!config.isActive()) {
        return
      }

      config.sendMessage({ type: 'ping' })

      timers.pongTimeout = setTimeout(() => {
        config.onPongTimeout()
      }, DEFAULT_PONG_TIMEOUT_MS)
    }, DEFAULT_PING_INTERVAL_MS)
  }

  function stop(): void {
    timers.clearPing()
    timers.clearPong()
  }

  function handlePong(): void {
    timers.clearPong()
  }

  return { start, stop, handlePong }
}

// ============================================================================
// Dedicated Connection (one subscription per connection)
// ============================================================================

function createDedicatedSubscription<TData = unknown, TVariables = Record<string, unknown>>(
  endpoint: string,
  options: SubscriptionOptions<TVariables>,
): SubscriptionHandle {
  // State
  let ws: WebSocket | null = null
  let isConnected = false
  let connectionState: ConnectionState = 'idle'
  let retryCount = 0
  let subscriptionId: string | null = null
  let intentionalClose = false
  let hasConnectedBefore = false
  let messageIdCounter = 0

  // Configuration
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const connectionTimeoutMs = options.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS
  const id = generateSubscriptionId()

  // Timer management
  const timers = createTimerManager()

  // State management
  function setState(state: ConnectionState): void {
    connectionState = state
    options.onStateChange?.(state)
  }

  // Message sending
  function sendMessage(message: GraphQLWSMessage): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  // Keep-alive
  const keepAlive = createKeepAliveHandler(
    {
      sendMessage,
      isActive: () => isConnected,
      onPongTimeout: () => {
        options.onError?.(new Error('Server not responding to ping'))
        cleanupConnection()
        scheduleReconnect()
      },
    },
    timers,
  )

  // Subscription
  function subscribe(): void {
    subscriptionId = String(++messageIdCounter)
    sendMessage({
      id: subscriptionId,
      type: 'subscribe',
      payload: {
        query: options.query,
        variables: options.variables,
      },
    })
  }

  // Connection cleanup
  function cleanupConnection(): void {
    keepAlive.stop()
    if (ws) {
      if (subscriptionId) {
        sendMessage({ id: subscriptionId, type: 'complete' })
      }
      ws.close()
      ws = null
      isConnected = false
      subscriptionId = null
    }
  }

  // Reconnection logic
  function scheduleReconnect(): void {
    timers.clearReconnect()

    if (retryCount < maxRetries) {
      retryCount++
      setState('reconnecting')
      options.onRetrying?.(retryCount, maxRetries)

      const delay = calculateBackoffDelay(retryCount)
      timers.reconnectTimeout = setTimeout(connect, delay)
    }
    else {
      setState('error')
      options.onMaxRetriesReached?.()
      options.onError?.(new Error('Max reconnection attempts reached'))
    }
  }

  // WebSocket message handler
  function handleMessage(data: string): void {
    const message = parseMessage(data)
    if (!message) {
      options.onError?.(new Error('Failed to parse message'))
      return
    }

    switch (message.type) {
      case 'connection_ack':
        handleConnectionAck()
        break

      case 'connection_error':
        handleConnectionError(message)
        break

      case 'next':
        handleNext(message)
        break

      case 'error':
        handleSubscriptionError(message)
        break

      case 'complete':
        subscriptionId = null
        break

      case 'ping':
        sendMessage({ type: 'pong' })
        break

      case 'pong':
        keepAlive.handlePong()
        break
    }
  }

  function handleConnectionAck(): void {
    timers.clearConnection()
    isConnected = true
    retryCount = 0
    setState('connected')

    if (hasConnectedBefore) {
      options.onReconnected?.()
    }
    else {
      hasConnectedBefore = true
      options.onConnected?.()
    }

    keepAlive.start()
    subscribe()
  }

  function handleConnectionError(message: GraphQLWSMessage): void {
    timers.clearConnection()
    const payload = message.payload as { message?: string } | undefined
    options.onError?.(new Error(payload?.message || 'Connection rejected'))
    setState('error')
  }

  function handleNext(message: GraphQLWSMessage): void {
    if (message.payload && typeof message.payload === 'object') {
      const payload = message.payload as GraphQLPayload
      if (payload.errors) {
        options.onError?.(new Error(extractErrorMessage(payload.errors, 'GraphQL Error')))
      }
      else if (payload.data) {
        const value = extractDataValue<TData>(payload.data)
        if (value !== undefined) {
          options.onData?.(value)
        }
      }
    }
  }

  function handleSubscriptionError(message: GraphQLWSMessage): void {
    if (Array.isArray(message.payload)) {
      const errors = message.payload as Array<{ message: string }>
      options.onError?.(new Error(extractErrorMessage(errors, 'Subscription error')))
    }
  }

  // Connection
  function connect(): void {
    if (!isWebSocketAvailable()) {
      options.onError?.(new Error('WebSocket not available'))
      setState('error')
      return
    }

    timers.clearReconnect()
    cleanupConnection()
    setState('connecting')

    const wsUrl = toWebSocketUrl(endpoint)
    ws = new WebSocket(wsUrl, 'graphql-transport-ws')

    ws.onopen = () => {
      timers.connectionTimeout = setTimeout(() => {
        options.onError?.(new Error('Connection timeout'))
        setState('error')
        cleanupConnection()
        scheduleReconnect()
      }, connectionTimeoutMs)

      sendMessage({
        type: 'connection_init',
        payload: options.connectionParams || {},
      })
    }

    ws.onmessage = (event: MessageEvent) => {
      const data = typeof event.data === 'string' ? event.data : String(event.data)
      handleMessage(data)
    }

    ws.onerror = () => {
      options.onError?.(new Error('WebSocket connection error'))
    }

    ws.onclose = () => {
      isConnected = false
      subscriptionId = null
      timers.clearConnection()
      options.onDisconnected?.()

      if (intentionalClose) {
        intentionalClose = false
        setState('disconnected')
        return
      }

      scheduleReconnect()
    }
  }

  // Disconnect
  function disconnect(): void {
    intentionalClose = true
    timers.clearAll()
    cleanupConnection()
    setState('disconnected')
  }

  // Initialize
  connect()

  return {
    unsubscribe: disconnect,
    get isConnected() {
      return isConnected
    },
    get state() {
      return connectionState
    },
    id,
    transport: 'websocket' as const,
  }
}

// ============================================================================
// Session (multiplexed connection)
// ============================================================================

interface SubscriptionEntry {
  id: string
  query: string
  variables?: Record<string, unknown>
  onData?: (data: unknown) => void
  onError?: (error: Error) => void
  onConnected?: () => void
  onReconnected?: () => void
  onDisconnected?: () => void
  onRetrying?: (attempt: number, maxAttempts: number) => void
  onMaxRetriesReached?: () => void
  onStateChange?: (state: ConnectionState) => void
  hasNotifiedConnect: boolean
}

export type StateChangeCallback = (state: ConnectionState, subscriptionCount: number) => void

export interface SubscriptionSession {
  subscribe: <TData = unknown, TVariables = Record<string, unknown>>(
    query: string,
    variables?: TVariables,
    onData?: (data: TData) => void,
    onError?: (error: Error) => void,
  ) => SubscriptionHandle
  readonly state: ConnectionState
  readonly isConnected: boolean
  readonly subscriptionCount: number
  close: () => void
  onStateChange: (callback: StateChangeCallback) => () => void
}

function createSession(
  endpoint: string,
  connectionParams: Record<string, unknown>,
  maxRetries: number,
  connectionTimeoutMs: number,
): SubscriptionSession {
  // State
  let ws: WebSocket | null = null
  let connectionState: ConnectionState = 'idle'
  let retryCount = 0
  let hasConnectedBefore = false
  let intentionalClose = false

  // Subscription management
  const subscriptions = new Map<string, SubscriptionEntry>()
  const pendingSubscriptions: SubscriptionEntry[] = []
  let messageIdCounter = 0

  // State change listeners
  const stateChangeListeners = new Set<StateChangeCallback>()

  // Timer management
  const timers = createTimerManager()

  // Notify all listeners about state change
  function notifyStateChange(): void {
    for (const listener of stateChangeListeners) {
      listener(connectionState, subscriptions.size)
    }
  }

  // State management
  function setState(state: ConnectionState): void {
    connectionState = state
    for (const sub of subscriptions.values()) {
      sub.onStateChange?.(state)
    }
    notifyStateChange()
  }

  function generateId(): string {
    return String(++messageIdCounter)
  }

  // Message sending
  function sendMessage(message: GraphQLWSMessage): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  // Keep-alive
  const keepAlive = createKeepAliveHandler(
    {
      sendMessage,
      isActive: () => connectionState === 'connected',
      onPongTimeout: () => {
        notifyAllError(new Error('Server not responding to ping'))
        cleanupConnection()
        scheduleReconnect()
      },
    },
    timers,
  )

  // Error notification
  function notifyAllError(error: Error): void {
    for (const sub of subscriptions.values()) {
      sub.onError?.(error)
    }
  }

  // Connection cleanup
  function cleanupConnection(): void {
    keepAlive.stop()
    if (ws) {
      ws.close()
      ws = null
    }
  }

  // Reconnection logic
  function scheduleReconnect(): void {
    timers.clearReconnect()

    if (retryCount < maxRetries) {
      retryCount++
      setState('reconnecting')

      for (const sub of subscriptions.values()) {
        sub.onRetrying?.(retryCount, maxRetries)
      }

      const delay = calculateBackoffDelay(retryCount)
      timers.reconnectTimeout = setTimeout(() => connect(), delay)
    }
    else {
      setState('error')
      for (const sub of subscriptions.values()) {
        sub.onMaxRetriesReached?.()
        sub.onError?.(new Error('Max reconnection attempts reached'))
      }
    }
  }

  // Send subscribe message for a subscription
  function sendSubscribe(sub: SubscriptionEntry): void {
    sendMessage({
      id: sub.id,
      type: 'subscribe',
      payload: {
        query: sub.query,
        variables: sub.variables,
      },
    })
  }

  // Internal subscribe (add to tracking and send if connected)
  function subscribeInternal(sub: SubscriptionEntry): void {
    subscriptions.set(sub.id, sub)
    notifyStateChange()

    if (connectionState === 'connected') {
      sendSubscribe(sub)
      if (!sub.hasNotifiedConnect) {
        sub.hasNotifiedConnect = true
        sub.onConnected?.()
      }
    }
  }

  // Message handler
  function handleMessage(data: string): void {
    const message = parseMessage(data)
    if (!message) {
      notifyAllError(new Error('Failed to parse message'))
      return
    }

    switch (message.type) {
      case 'connection_ack':
        handleConnectionAck()
        break

      case 'connection_error':
        handleConnectionError(message)
        break

      case 'next':
        handleNext(message)
        break

      case 'error':
        handleSubscriptionError(message)
        break

      case 'complete':
        handleComplete(message)
        break

      case 'ping':
        sendMessage({ type: 'pong' })
        break

      case 'pong':
        keepAlive.handlePong()
        break
    }
  }

  function handleConnectionAck(): void {
    timers.clearConnection()
    retryCount = 0
    setState('connected')
    keepAlive.start()

    const isReconnect = hasConnectedBefore
    hasConnectedBefore = true

    // Subscribe all pending subscriptions
    for (const sub of pendingSubscriptions) {
      subscribeInternal(sub)
    }
    pendingSubscriptions.length = 0

    // Resubscribe existing subscriptions after reconnect
    if (isReconnect) {
      for (const sub of subscriptions.values()) {
        sub.onReconnected?.()
        sendSubscribe(sub)
      }
    }
    else {
      for (const sub of subscriptions.values()) {
        if (!sub.hasNotifiedConnect) {
          sub.hasNotifiedConnect = true
          sub.onConnected?.()
        }
      }
    }
  }

  function handleConnectionError(message: GraphQLWSMessage): void {
    timers.clearConnection()
    const payload = message.payload as { message?: string } | undefined
    notifyAllError(new Error(payload?.message || 'Connection rejected'))
    setState('error')
  }

  function handleNext(message: GraphQLWSMessage): void {
    if (!message.id) {
      return
    }

    const sub = subscriptions.get(message.id)
    if (!sub) {
      return
    }

    if (message.payload && typeof message.payload === 'object') {
      const payload = message.payload as GraphQLPayload
      if (payload.errors) {
        sub.onError?.(new Error(extractErrorMessage(payload.errors, 'GraphQL Error')))
      }
      else if (payload.data) {
        const value = extractDataValue(payload.data)
        if (value !== undefined) {
          sub.onData?.(value)
        }
      }
    }
  }

  function handleSubscriptionError(message: GraphQLWSMessage): void {
    if (!message.id) {
      return
    }

    const sub = subscriptions.get(message.id)
    if (sub && Array.isArray(message.payload)) {
      const errors = message.payload as Array<{ message: string }>
      sub.onError?.(new Error(extractErrorMessage(errors, 'Subscription error')))
    }
  }

  function handleComplete(message: GraphQLWSMessage): void {
    if (message.id) {
      subscriptions.delete(message.id)
      notifyStateChange()
    }
  }

  // Connection
  function connect(): void {
    if (connectionState === 'connected' || connectionState === 'connecting') {
      return
    }
    if (!isWebSocketAvailable()) {
      notifyAllError(new Error('WebSocket not available'))
      setState('error')
      return
    }

    timers.clearReconnect()
    setState('connecting')

    const wsUrl = toWebSocketUrl(endpoint)
    ws = new WebSocket(wsUrl, 'graphql-transport-ws')

    ws.onopen = () => {
      timers.connectionTimeout = setTimeout(() => {
        notifyAllError(new Error('Connection timeout'))
        setState('error')
        cleanupConnection()
        scheduleReconnect()
      }, connectionTimeoutMs)

      sendMessage({
        type: 'connection_init',
        payload: connectionParams,
      })
    }

    ws.onmessage = (event: MessageEvent) => {
      const data = typeof event.data === 'string' ? event.data : String(event.data)
      handleMessage(data)
    }

    ws.onerror = () => {
      notifyAllError(new Error('WebSocket connection error'))
    }

    ws.onclose = () => {
      timers.clearConnection()

      for (const sub of subscriptions.values()) {
        sub.onDisconnected?.()
      }

      if (intentionalClose) {
        intentionalClose = false
        setState('disconnected')
        return
      }

      scheduleReconnect()
    }
  }

  // Unsubscribe a single subscription
  function unsubscribe(id: string): void {
    const sub = subscriptions.get(id)
    if (sub) {
      if (connectionState === 'connected') {
        sendMessage({ id, type: 'complete' })
      }
      subscriptions.delete(id)
      notifyStateChange()
    }

    // Also check pending subscriptions
    const pendingIdx = pendingSubscriptions.findIndex(s => s.id === id)
    if (pendingIdx !== -1) {
      pendingSubscriptions.splice(pendingIdx, 1)
    }

    // If no more subscriptions, close the connection
    if (subscriptions.size === 0 && pendingSubscriptions.length === 0) {
      close()
    }
  }

  // Close all subscriptions and connection
  function close(): void {
    intentionalClose = true
    timers.clearAll()

    if (connectionState === 'connected') {
      for (const sub of subscriptions.values()) {
        sendMessage({ id: sub.id, type: 'complete' })
      }
    }

    subscriptions.clear()
    pendingSubscriptions.length = 0
    cleanupConnection()
    setState('disconnected')
  }

  return {
    subscribe<TData = unknown, TVariables = Record<string, unknown>>(
      query: string,
      variables?: TVariables,
      onData?: (data: TData) => void,
      onError?: (error: Error) => void,
    ): SubscriptionHandle {
      const id = generateId()
      const entry: SubscriptionEntry = {
        id,
        query,
        variables: variables as Record<string, unknown> | undefined,
        onData: onData as (data: unknown) => void,
        onError,
        hasNotifiedConnect: false,
      }

      if (connectionState === 'connected') {
        subscribeInternal(entry)
      }
      else {
        pendingSubscriptions.push(entry)
        notifyStateChange()
        connect()
      }

      return {
        unsubscribe: () => unsubscribe(id),
        get isConnected() {
          return connectionState === 'connected'
        },
        get state() {
          return connectionState
        },
        id,
        transport: 'websocket' as const,
      }
    },

    get state() {
      return connectionState
    },

    get isConnected() {
      return connectionState === 'connected'
    },

    get subscriptionCount() {
      return subscriptions.size
    },

    close,

    onStateChange(callback: StateChangeCallback): () => void {
      stateChangeListeners.add(callback)
      return () => stateChangeListeners.delete(callback)
    },
  }
}

// ============================================================================
// Subscription Client Factory
// ============================================================================

export interface SubscriptionClientConfig {
  /** WebSocket endpoint (default: '/api/graphql/ws') */
  wsEndpoint?: string
  /** SSE endpoint for SSE transport (default: '/api/graphql') */
  sseEndpoint?: string
  /** Connection parameters for WebSocket handshake */
  connectionParams?: Record<string, unknown> | (() => Record<string, unknown> | Promise<Record<string, unknown>>)
  /** Connection timeout in ms (default: 10000) */
  connectionTimeoutMs?: number
  /** Maximum retry attempts (default: 5) */
  maxRetries?: number
}

export interface SubscriptionClient {
  subscribe: <TData = unknown, TVariables = Record<string, unknown>>(
    query: string,
    variables?: TVariables,
    onData?: (data: TData) => void,
    onError?: (error: Error) => void,
    transportOptions?: TransportOptions,
  ) => SubscriptionHandle
  subscribeAsync: <_TData = unknown, TVariables = Record<string, unknown>>(
    options: SubscriptionOptions<TVariables>,
    transportOptions?: TransportOptions,
  ) => Promise<SubscriptionHandle>
  createSession: () => SubscriptionSession
}

/**
 * Resolve transport type from options
 */
function resolveTransport(options?: TransportOptions): SubscriptionTransport {
  if (options?.sse) {
    return 'sse'
  }
  return options?.transport ?? 'websocket'
}

export function createSubscriptionClient(config: SubscriptionClientConfig = {}): SubscriptionClient {
  const wsEndpoint = config.wsEndpoint ?? '/api/graphql/ws'
  const sseEndpoint = config.sseEndpoint ?? '/api/graphql'
  const configConnectionParams = config.connectionParams
  const connectionTimeoutMs = config.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES

  function getConnectionParams(): Record<string, unknown> {
    if (!configConnectionParams) {
      return {}
    }
    if (typeof configConnectionParams === 'function') {
      const result = configConnectionParams()
      if (result instanceof Promise) {
        console.warn('[nitro-graphql] Async connectionParams not supported in subscribe(), use subscribeAsync()')
        return {}
      }
      return result
    }
    return configConnectionParams
  }

  return {
    subscribe<TData = unknown, TVariables = Record<string, unknown>>(
      query: string,
      variables?: TVariables,
      onData?: (data: TData) => void,
      onError?: (error: Error) => void,
      transportOptions?: TransportOptions,
    ): SubscriptionHandle {
      const transport = resolveTransport(transportOptions)
      const subscriptionOptions: SubscriptionOptions<TVariables> = {
        query,
        variables,
        onData: onData as (data: unknown) => void,
        onError,
        connectionParams: getConnectionParams(),
        connectionTimeoutMs,
        maxRetries,
      }

      if (transport === 'sse') {
        return createSseDedicatedSubscription<TData, TVariables>(sseEndpoint, subscriptionOptions)
      }

      if (transport === 'auto') {
        return createAutoSubscription<TData, TVariables>(wsEndpoint, sseEndpoint, subscriptionOptions)
      }

      // Default: WebSocket
      return createDedicatedSubscription<TData, TVariables>(wsEndpoint, subscriptionOptions)
    },

    async subscribeAsync<TData = unknown, TVariables = Record<string, unknown>>(
      options: SubscriptionOptions<TVariables>,
      transportOptions?: TransportOptions,
    ): Promise<SubscriptionHandle> {
      let connectionParams = options.connectionParams
      if (!connectionParams && configConnectionParams) {
        connectionParams = typeof configConnectionParams === 'function'
          ? await configConnectionParams()
          : configConnectionParams
      }

      const transport = resolveTransport(transportOptions)
      const subscriptionOptions: SubscriptionOptions<TVariables> = {
        ...options,
        connectionParams,
        connectionTimeoutMs: options.connectionTimeoutMs ?? connectionTimeoutMs,
        maxRetries: options.maxRetries ?? maxRetries,
      }

      if (transport === 'sse') {
        return createSseDedicatedSubscription<TData, TVariables>(sseEndpoint, subscriptionOptions)
      }

      if (transport === 'auto') {
        return createAutoSubscription<TData, TVariables>(wsEndpoint, sseEndpoint, subscriptionOptions)
      }

      // Default: WebSocket
      return createDedicatedSubscription<TData, TVariables>(wsEndpoint, subscriptionOptions)
    },

    createSession(): SubscriptionSession {
      return createSession(wsEndpoint, getConnectionParams(), maxRetries, connectionTimeoutMs)
    },
  }
}

// ============================================================================
// SSE Subscription (alternative transport)
// ============================================================================

export interface SseSubscriptionOptions<TVariables = Record<string, unknown>> {
  query: string
  variables?: TVariables
  onData?: (data: unknown) => void
  onError?: (error: Error) => void
  onConnected?: () => void
  onReconnected?: () => void
  onDisconnected?: () => void
  onStateChange?: (state: ConnectionState) => void
}

export interface SseSubscriptionHandle {
  close: () => void
}

/**
 * Create an SSE subscription using native EventSource (legacy API)
 * Use this when WebSocket is blocked (corporate firewalls, etc.)
 *
 * @deprecated Use the unified client with { transport: 'sse' } instead
 *
 * @example
 * ```typescript
 * const handle = createSseSubscription('/api/graphql', {
 *   query: 'subscription { countdown(from: 10) }',
 *   onData: (data) => console.log(data),
 * })
 *
 * // Later...
 * handle.close()
 * ```
 */
export function createSseSubscription<TData = unknown, TVariables = Record<string, unknown>>(
  endpoint: string,
  options: SseSubscriptionOptions<TVariables>,
): SseSubscriptionHandle {
  const url = new URL(endpoint, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
  url.searchParams.set('query', options.query)
  if (options.variables) {
    url.searchParams.set('variables', JSON.stringify(options.variables))
  }

  const es = new EventSource(url.toString())

  es.onmessage = (event) => {
    try {
      const response = JSON.parse(event.data) as { data?: Record<string, unknown>, errors?: Array<{ message: string }> }
      if (response.errors && response.errors.length > 0) {
        options.onError?.(new Error(response.errors[0]?.message || 'SSE Error'))
      }
      else if (response.data) {
        const value = Object.values(response.data)[0] as TData
        options.onData?.(value)
      }
    }
    catch {
      // Ignore parse errors
    }
  }

  es.onerror = () => {
    options.onError?.(new Error('SSE connection error'))
    es.close()
  }

  return {
    close: () => es.close(),
  }
}

// ============================================================================
// SSE Dedicated Subscription (with full state management)
// ============================================================================

/**
 * Create an SSE subscription with full state management (matching WebSocket API)
 * Uses native EventSource which handles reconnection automatically.
 */
function createSseDedicatedSubscription<TData = unknown, TVariables = Record<string, unknown>>(
  endpoint: string,
  options: SubscriptionOptions<TVariables>,
): SubscriptionHandle {
  // State
  let es: EventSource | null = null
  let connectionState: ConnectionState = 'idle'
  let hasConnectedBefore = false
  let intentionalClose = false
  const id = generateSubscriptionId()

  // State management
  function setState(state: ConnectionState): void {
    connectionState = state
    options.onStateChange?.(state)
  }

  // Build URL with query and variables
  function buildUrl(): string {
    const url = new URL(endpoint, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    url.searchParams.set('query', options.query)
    if (options.variables) {
      url.searchParams.set('variables', JSON.stringify(options.variables))
    }
    return url.toString()
  }

  // Connection
  function connect(): void {
    if (typeof EventSource === 'undefined') {
      options.onError?.(new Error('EventSource not available'))
      setState('error')
      return
    }

    setState('connecting')
    es = new EventSource(buildUrl())

    es.onopen = () => {
      setState('connected')

      if (hasConnectedBefore) {
        options.onReconnected?.()
      }
      else {
        hasConnectedBefore = true
        options.onConnected?.()
      }
    }

    es.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data) as { data?: Record<string, unknown>, errors?: Array<{ message: string }> }
        if (response.errors && response.errors.length > 0) {
          options.onError?.(new Error(response.errors[0]?.message || 'SSE Error'))
        }
        else if (response.data) {
          const value = extractDataValue<TData>(response.data)
          if (value !== undefined) {
            options.onData?.(value)
          }
        }
      }
      catch {
        // Ignore parse errors
      }
    }

    es.onerror = () => {
      // EventSource handles reconnection automatically
      // readyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
      if (es?.readyState === EventSource.CONNECTING) {
        setState('reconnecting')
        options.onRetrying?.(1, 999) // EventSource retries indefinitely
      }
      else if (es?.readyState === EventSource.CLOSED) {
        if (!intentionalClose) {
          options.onError?.(new Error('SSE connection closed'))
          setState('error')
        }
      }
    }
  }

  // Disconnect
  function disconnect(): void {
    intentionalClose = true
    if (es) {
      es.close()
      es = null
    }
    options.onDisconnected?.()
    setState('disconnected')
  }

  // Initialize
  connect()

  return {
    unsubscribe: disconnect,
    get isConnected() {
      return connectionState === 'connected'
    },
    get state() {
      return connectionState
    },
    id,
    transport: 'sse' as const,
  }
}

// ============================================================================
// Auto Transport (WebSocket first, SSE fallback)
// ============================================================================

/**
 * Create a subscription with auto transport selection
 * Tries WebSocket first, falls back to SSE if WebSocket fails to connect
 */
function createAutoSubscription<TData = unknown, TVariables = Record<string, unknown>>(
  wsEndpoint: string,
  sseEndpoint: string,
  options: SubscriptionOptions<TVariables>,
): SubscriptionHandle {
  let activeHandle: SubscriptionHandle | null = null
  let activeTransport: 'websocket' | 'sse' = 'websocket'
  let connectionState: ConnectionState = 'idle'
  const id = generateSubscriptionId()

  // Track whether we've notified about connection
  let hasNotifiedConnect = false

  // Wrapper callbacks that update our state
  const wrappedOptions: SubscriptionOptions<TVariables> = {
    ...options,
    onStateChange: (state) => {
      connectionState = state
      options.onStateChange?.(state)
    },
    onConnected: () => {
      if (!hasNotifiedConnect) {
        hasNotifiedConnect = true
        options.onConnected?.()
      }
    },
    onReconnected: () => {
      options.onReconnected?.()
    },
  }

  // Try WebSocket first
  function tryWebSocket(): void {
    if (!isWebSocketAvailable()) {
      // WebSocket not available, go straight to SSE
      trySSE()
      return
    }

    activeTransport = 'websocket'
    let wsConnectionTimeout: ReturnType<typeof setTimeout> | null = null
    let wsConnected = false

    const wsOptions: SubscriptionOptions<TVariables> = {
      ...wrappedOptions,
      onConnected: () => {
        wsConnected = true
        if (wsConnectionTimeout) {
          clearTimeout(wsConnectionTimeout)
          wsConnectionTimeout = null
        }
        wrappedOptions.onConnected?.()
      },
      onError: (error) => {
        // If we haven't connected yet, try SSE
        if (!wsConnected && !hasNotifiedConnect) {
          activeHandle?.unsubscribe()
          trySSE()
        }
        else {
          options.onError?.(error)
        }
      },
      onMaxRetriesReached: () => {
        // If WS exhausted retries without ever connecting, try SSE
        if (!wsConnected && !hasNotifiedConnect) {
          activeHandle?.unsubscribe()
          trySSE()
        }
        else {
          options.onMaxRetriesReached?.()
        }
      },
    }

    activeHandle = createDedicatedSubscription<TData, TVariables>(wsEndpoint, wsOptions)

    // Set a connection timeout to fallback to SSE
    wsConnectionTimeout = setTimeout(() => {
      if (!wsConnected && !hasNotifiedConnect) {
        activeHandle?.unsubscribe()
        trySSE()
      }
    }, options.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS)
  }

  // Fallback to SSE
  function trySSE(): void {
    activeTransport = 'sse'
    activeHandle = createSseDedicatedSubscription<TData, TVariables>(sseEndpoint, wrappedOptions)
  }

  // Start with WebSocket
  tryWebSocket()

  return {
    unsubscribe: () => {
      activeHandle?.unsubscribe()
    },
    get isConnected() {
      return activeHandle?.isConnected ?? false
    },
    get state() {
      return connectionState
    },
    id,
    get transport() {
      return activeTransport
    },
  }
}
