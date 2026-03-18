/**
 * Vue subscription builder & composables code generator
 *
 * Generates Drizzle-style subscription API + Vue 3 composables from
 * GraphQL subscription operations. This is framework-specific (Vue)
 * and separated from the framework-agnostic client codegen pipeline.
 */

import type { Source } from '@graphql-tools/utils'
import { extractSubscriptions } from './subscription-extractor'

/**
 * Generate subscription builder code (Drizzle-style API) + Vue Composables
 * Returns empty string if subscriptions are not enabled or no subscription operations found
 */
export function generateSubscriptionBuilder(docs: Source[], subscriptionsEnabled: boolean): string {
  // Skip if subscriptions are not enabled in config
  if (!subscriptionsEnabled)
    return ''

  const subscriptions = extractSubscriptions(docs)
  if (subscriptions.length === 0)
    return ''

  let output = `
// === Subscription Imports ===
import { ref, onUnmounted, computed } from 'vue'
import type { Ref } from 'vue'
import type {
  ConnectionState,
  SubscriptionHandle,
  SubscriptionSession,
  SubscriptionTransport,
  TransportOptions,
} from 'nitro-graphql/subscribe'
import { subscriptionClient } from './subscribe'

// === Subscription Types ===
export type { ConnectionState, SubscriptionHandle, SubscriptionSession, SubscriptionTransport, TransportOptions }

export interface UseSubscriptionOptions<T> {
  /** Auto-start subscription on mount (default: false) */
  immediate?: boolean
  /** Callback when subscription starts */
  onStart?: () => void
  /** Callback when subscription stops */
  onStop?: () => void
  /** Callback when data is received */
  onData?: (data: T) => void
  /** Callback when error occurs */
  onError?: (error: Error) => void
  /** Callback when WebSocket connects */
  onConnected?: () => void
  /** Callback when WebSocket reconnects */
  onReconnected?: () => void
  /** Callback when WebSocket disconnects */
  onDisconnected?: () => void
  /** Callback when connection state changes */
  onStateChange?: (state: ConnectionState) => void
  /** Use existing session for multiplexing (pass result from useSubscriptionSession) */
  session?: UseSubscriptionSessionReturn
  /** Transport type: 'websocket' (default), 'sse', or 'auto' (WS first, SSE fallback) */
  transport?: SubscriptionTransport
}

export interface UseSubscriptionReturn<T> {
  /** Reactive subscription data */
  data: Ref<T | null>
  /** Reactive error state */
  error: Ref<Error | null>
  /** Is subscription active */
  isActive: Ref<boolean>
  /** Connection state */
  state: Ref<ConnectionState>
  /** Active transport type ('websocket' | 'sse') */
  transport: Ref<'websocket' | 'sse'>
  /** Start subscription */
  start: () => void
  /** Stop subscription */
  stop: () => void
  /** Restart subscription */
  restart: () => void
}

// === Subscription Builder (Drizzle-style API) ===
interface SubscriptionBuilder<TData> {
  onData(fn: (data: TData) => void): SubscriptionBuilder<TData>
  onError(fn: (error: Error) => void): SubscriptionBuilder<TData>
  start(): SubscriptionHandle
  subscribe(fn: (data: TData) => void): SubscriptionHandle
}

function createSubscriptionBuilder<TData>(query: string, variables: unknown): SubscriptionBuilder<TData> {
  let onDataFn: ((data: TData) => void) | undefined
  let onErrorFn: ((error: Error) => void) | undefined

  const builder: SubscriptionBuilder<TData> = {
    onData(fn: (data: TData) => void) {
      onDataFn = fn
      return builder
    },
    onError(fn: (error: Error) => void) {
      onErrorFn = fn
      return builder
    },
    start(): SubscriptionHandle {
      return subscriptionClient.subscribe(query, variables, onDataFn, onErrorFn)
    },
    subscribe(fn: (data: TData) => void): SubscriptionHandle {
      return subscriptionClient.subscribe(query, variables, fn, undefined)
    },
  }

  return builder
}

export const subscription = {
`

  // Generate Drizzle-style subscription methods
  for (const sub of subscriptions) {
    if (sub.hasVariables) {
      output += `  ${sub.typeName}(variables: Types.${sub.typeName}SubscriptionVariables): SubscriptionBuilder<Types.${sub.typeName}Subscription['${sub.fieldName}']> {
    return createSubscriptionBuilder<Types.${sub.typeName}Subscription['${sub.fieldName}']>(${sub.typeName}Document, variables)
  },
`
    }
    else {
      output += `  ${sub.typeName}(): SubscriptionBuilder<Types.${sub.typeName}Subscription['${sub.fieldName}']> {
    return createSubscriptionBuilder<Types.${sub.typeName}Subscription['${sub.fieldName}']>(${sub.typeName}Document, undefined)
  },
`
    }
  }

  output += `}

// === Framework-Agnostic Session (for non-Vue usage) ===
/**
 * Create a multiplexed subscription session (framework-agnostic)
 * All subscriptions share a single WebSocket connection.
 *
 * @example
 * // Vanilla JS / Node.js / React / etc.
 * const session = createSubscriptionSession()
 * const sub1 = session.subscribe(query1, vars1, onData1)
 * const sub2 = session.subscribe(query2, vars2, onData2)
 * // Both use the same WebSocket connection
 * sub1.unsubscribe()
 * session.close() // Close all
 *
 * @returns SubscriptionSession - Framework-agnostic session object
 */
export function createSubscriptionSession(): SubscriptionSession {
  return subscriptionClient.createSession()
}

// === Vue Composable: useSubscriptionSession (Multiplexing) ===
export interface UseSubscriptionSessionReturn {
  /** The underlying session object */
  session: SubscriptionSession
  /** Subscribe using the shared session */
  subscribe: <TData = unknown>(
    query: string,
    variables: unknown,
    onData?: (data: TData) => void,
    onError?: (error: Error) => void,
  ) => SubscriptionHandle
  /** Close all subscriptions and the connection */
  close: () => void
  /** Is the session connected (reactive) */
  isConnected: Ref<boolean>
  /** Current connection state (reactive) */
  state: Ref<ConnectionState>
  /** Number of active subscriptions (reactive) */
  subscriptionCount: Ref<number>
}

/**
 * Vue composable for multiplexed subscription session
 * Provides reactive state and automatic cleanup on unmount.
 *
 * @example
 * // Vue 3 component
 * const session = useSubscriptionSession()
 * const { data } = useCountdown({ from: 10 }, { session })
 * // Session auto-closes on component unmount
 *
 * @returns UseSubscriptionSessionReturn - Vue-reactive session wrapper
 */
export function useSubscriptionSession(): UseSubscriptionSessionReturn {
  const session = subscriptionClient.createSession()

  // Use refs for reactivity (session getters are not reactive)
  const isConnected = ref(session.isConnected)
  const state = ref<ConnectionState>(session.state)
  const subscriptionCount = ref(session.subscriptionCount)

  // Update refs when session state changes
  function updateRefs() {
    isConnected.value = session.isConnected
    state.value = session.state
    subscriptionCount.value = session.subscriptionCount
  }

  // Subscribe to session state changes for automatic reactivity
  const unsubscribeStateChange = session.onStateChange(() => {
    updateRefs()
  })

  function subscribe<TData = unknown>(
    query: string,
    variables: unknown,
    onData?: (data: TData) => void,
    onError?: (error: Error) => void,
  ): SubscriptionHandle {
    return session.subscribe(query, variables, onData as (data: unknown) => void, onError)
  }

  function close() {
    session.close()
  }

  onUnmounted(() => {
    unsubscribeStateChange()
    close()
  })

  return {
    session,
    subscribe,
    close,
    isConnected,
    state,
    subscriptionCount,
  }
}

// === Vue Composables ===
function createUseSubscription<TData, TVariables = undefined>(
  query: string,
  getVariables: () => TVariables,
): (options?: UseSubscriptionOptions<TData>) => UseSubscriptionReturn<TData> {
  return (options: UseSubscriptionOptions<TData> = {}): UseSubscriptionReturn<TData> => {
    const data = ref<TData | null>(null) as Ref<TData | null>
    const error = ref<Error | null>(null)
    const isActive = ref(false)
    const state = ref<ConnectionState>('idle')
    const transport = ref<'websocket' | 'sse'>('websocket')
    let handle: SubscriptionHandle | null = null

    // Resolve transport options
    const transportOptions: TransportOptions = {
      transport: options.transport,
    }

    function start() {
      stop()
      isActive.value = true
      error.value = null
      options.onStart?.()

      const variables = getVariables()

      if (options.session) {
        // Use existing session for multiplexing (WebSocket only)
        handle = options.session.subscribe<TData>(
          query,
          variables,
          (d: TData) => {
            data.value = d
            options.onData?.(d)
          },
          (e: Error) => {
            error.value = e
            options.onError?.(e)
          },
        )
        transport.value = 'websocket'
      } else {
        // Create dedicated connection with transport selection
        handle = subscriptionClient.subscribe<TData>(
          query,
          variables,
          (d: TData) => {
            data.value = d
            options.onData?.(d)
          },
          (e: Error) => {
            error.value = e
            options.onError?.(e)
          },
          transportOptions,
        )
        // Update transport ref from handle
        transport.value = handle.transport
      }
    }

    function stop() {
      if (handle) {
        handle.unsubscribe()
        handle = null
        isActive.value = false
        options.onStop?.()
      }
    }

    function restart() {
      stop()
      start()
    }

    if (options.immediate) {
      start()
    }

    onUnmounted(stop)

    return { data, error, isActive, state, transport, start, stop, restart }
  }
}

// === Subscription Return Types ===
`

  // Generate type aliases for each subscription composable
  for (const sub of subscriptions) {
    const typeName = `Types.${sub.typeName}Subscription['${sub.fieldName}']`
    output += `/** Return type for use${sub.typeName} composable */
export type Use${sub.typeName}Return = UseSubscriptionReturn<${typeName}>
`
  }

  output += `
// === Vue Composables ===
`

  // Generate individual composables for each subscription
  for (const sub of subscriptions) {
    const typeName = `Types.${sub.typeName}Subscription['${sub.fieldName}']`
    const varsType = `Types.${sub.typeName}SubscriptionVariables`

    if (sub.hasVariables) {
      output += `/**
 * Vue composable for ${sub.typeName} subscription
 * @param variables - Subscription variables
 * @param options - Subscription options (immediate, onData, onError, session, etc.)
 * @returns Reactive subscription state: { data, error, isActive, state, start, stop, restart }
 */
export function use${sub.typeName}(
  variables: ${varsType},
  options?: UseSubscriptionOptions<${typeName}>,
): Use${sub.typeName}Return {
  return createUseSubscription<${typeName}, ${varsType}>(
    ${sub.typeName}Document,
    () => variables,
  )(options)
}

`
    }
    else {
      output += `/**
 * Vue composable for ${sub.typeName} subscription
 * @param options - Subscription options (immediate, onData, onError, session, etc.)
 * @returns Reactive subscription state: { data, error, isActive, state, start, stop, restart }
 */
export function use${sub.typeName}(
  options?: UseSubscriptionOptions<${typeName}>,
): Use${sub.typeName}Return {
  return createUseSubscription<${typeName}, undefined>(
    ${sub.typeName}Document,
    () => undefined,
  )(options)
}

`
    }
  }

  return output
}
