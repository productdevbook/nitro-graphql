// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import type * as Types from '#graphql/client';

import type { ExecutionResult } from 'graphql';

export const CreateUserDocument = /*#__PURE__*/ `
    mutation createUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
    createdAt
  }
}
    `;
export const UpdateUserDocument = /*#__PURE__*/ `
    mutation updateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    name
    email
    createdAt
  }
}
    `;
export const DeleteUserDocument = /*#__PURE__*/ `
    mutation deleteUser($id: ID!) {
  deleteUser(id: $id)
}
    `;
export const GetUsersDocument = /*#__PURE__*/ `
    query GetUsers {
  users {
    id
    name
    email
    createdAt
  }
}
    `;
export const GetUserDocument = /*#__PURE__*/ `
    query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    createdAt
  }
}
    `;
export const CountdownDocument = /*#__PURE__*/ `
    subscription Countdown($from: Int!) {
  countdown(from: $from)
}
    `;
export const GreetingsDocument = /*#__PURE__*/ `
    subscription Greetings {
  greetings
}
    `;
export const ServerTimeDocument = /*#__PURE__*/ `
    subscription ServerTime {
  serverTime
}
    `;
export const GetPostsDocument = /*#__PURE__*/ `
    query GetPosts {
  posts {
    id
    title
    content
    author
    createdAt
  }
}
    `;
export const GetPostDocument = /*#__PURE__*/ `
    query GetPost($id: ID!) {
  post(id: $id) {
    id
    title
    content
    author
    createdAt
  }
}
    `;
export const CreatePostDocument = /*#__PURE__*/ `
    mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    title
    content
    author
    createdAt
  }
}
    `;
export type Requester<C = {}, E = unknown> = <R, V>(doc: string, vars?: V, options?: C) => Promise<ExecutionResult<R, E>> | AsyncIterable<ExecutionResult<R, E>>
export function getSdk<C, E>(requester: Requester<C, E>) {
  return {
    createUser(variables: Types.CreateUserMutationVariables, options?: C): Promise<ExecutionResult<Types.CreateUserMutation, E>> {
      return requester<Types.CreateUserMutation, Types.CreateUserMutationVariables>(CreateUserDocument, variables, options) as Promise<ExecutionResult<Types.CreateUserMutation, E>>;
    },
    updateUser(variables: Types.UpdateUserMutationVariables, options?: C): Promise<ExecutionResult<Types.UpdateUserMutation, E>> {
      return requester<Types.UpdateUserMutation, Types.UpdateUserMutationVariables>(UpdateUserDocument, variables, options) as Promise<ExecutionResult<Types.UpdateUserMutation, E>>;
    },
    deleteUser(variables: Types.DeleteUserMutationVariables, options?: C): Promise<ExecutionResult<Types.DeleteUserMutation, E>> {
      return requester<Types.DeleteUserMutation, Types.DeleteUserMutationVariables>(DeleteUserDocument, variables, options) as Promise<ExecutionResult<Types.DeleteUserMutation, E>>;
    },
    GetUsers(variables?: Types.GetUsersQueryVariables, options?: C): Promise<ExecutionResult<Types.GetUsersQuery, E>> {
      return requester<Types.GetUsersQuery, Types.GetUsersQueryVariables>(GetUsersDocument, variables, options) as Promise<ExecutionResult<Types.GetUsersQuery, E>>;
    },
    GetUser(variables: Types.GetUserQueryVariables, options?: C): Promise<ExecutionResult<Types.GetUserQuery, E>> {
      return requester<Types.GetUserQuery, Types.GetUserQueryVariables>(GetUserDocument, variables, options) as Promise<ExecutionResult<Types.GetUserQuery, E>>;
    },
    Countdown(variables: Types.CountdownSubscriptionVariables, options?: C): AsyncIterable<ExecutionResult<Types.CountdownSubscription, E>> {
      return requester<Types.CountdownSubscription, Types.CountdownSubscriptionVariables>(CountdownDocument, variables, options) as AsyncIterable<ExecutionResult<Types.CountdownSubscription, E>>;
    },
    Greetings(variables?: Types.GreetingsSubscriptionVariables, options?: C): AsyncIterable<ExecutionResult<Types.GreetingsSubscription, E>> {
      return requester<Types.GreetingsSubscription, Types.GreetingsSubscriptionVariables>(GreetingsDocument, variables, options) as AsyncIterable<ExecutionResult<Types.GreetingsSubscription, E>>;
    },
    ServerTime(variables?: Types.ServerTimeSubscriptionVariables, options?: C): AsyncIterable<ExecutionResult<Types.ServerTimeSubscription, E>> {
      return requester<Types.ServerTimeSubscription, Types.ServerTimeSubscriptionVariables>(ServerTimeDocument, variables, options) as AsyncIterable<ExecutionResult<Types.ServerTimeSubscription, E>>;
    },
    GetPosts(variables?: Types.GetPostsQueryVariables, options?: C): Promise<ExecutionResult<Types.GetPostsQuery, E>> {
      return requester<Types.GetPostsQuery, Types.GetPostsQueryVariables>(GetPostsDocument, variables, options) as Promise<ExecutionResult<Types.GetPostsQuery, E>>;
    },
    GetPost(variables: Types.GetPostQueryVariables, options?: C): Promise<ExecutionResult<Types.GetPostQuery, E>> {
      return requester<Types.GetPostQuery, Types.GetPostQueryVariables>(GetPostDocument, variables, options) as Promise<ExecutionResult<Types.GetPostQuery, E>>;
    },
    CreatePost(variables: Types.CreatePostMutationVariables, options?: C): Promise<ExecutionResult<Types.CreatePostMutation, E>> {
      return requester<Types.CreatePostMutation, Types.CreatePostMutationVariables>(CreatePostDocument, variables, options) as Promise<ExecutionResult<Types.CreatePostMutation, E>>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;
// === Subscription Imports ===
import { ref, onUnmounted, computed } from 'vue'
import type { Ref } from 'vue'
import {
  subscriptionClient,
  type SubscriptionHandle,
  type SubscriptionSession,
  type ConnectionState,
} from './subscribe'

// === Subscription Types ===
export type { ConnectionState, SubscriptionHandle, SubscriptionSession }

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
  /** Use existing session for multiplexing */
  session?: SubscriptionSession
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
  countdown(variables: Types.CountdownSubscriptionVariables): SubscriptionBuilder<Types.CountdownSubscription['countdown']> {
    return createSubscriptionBuilder<Types.CountdownSubscription['countdown']>(CountdownDocument, variables)
  },
  greetings(): SubscriptionBuilder<Types.GreetingsSubscription['greetings']> {
    return createSubscriptionBuilder<Types.GreetingsSubscription['greetings']>(GreetingsDocument, undefined)
  },
  serverTime(): SubscriptionBuilder<Types.ServerTimeSubscription['serverTime']> {
    return createSubscriptionBuilder<Types.ServerTimeSubscription['serverTime']>(ServerTimeDocument, undefined)
  },
}

// === useSubscriptionSession Hook (Multiplexing) ===
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
  /** Is the session connected */
  isConnected: Ref<boolean>
  /** Current connection state */
  state: Ref<ConnectionState>
  /** Number of active subscriptions */
  subscriptionCount: Ref<number>
}

export function useSubscriptionSession(): UseSubscriptionSessionReturn {
  const session = subscriptionClient.createSession()

  const isConnected = computed(() => session.isConnected)
  const state = computed(() => session.state)
  const subscriptionCount = computed(() => session.subscriptionCount)

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

  onUnmounted(close)

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
    let handle: SubscriptionHandle | null = null

    function start() {
      stop()
      isActive.value = true
      error.value = null
      options.onStart?.()

      const variables = getVariables()

      if (options.session) {
        // Use existing session for multiplexing
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
      } else {
        // Create dedicated connection
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
        )
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

    return { data, error, isActive, state, start, stop, restart }
  }
}

export function useCountdown(
  variables: Types.CountdownSubscriptionVariables,
  options?: UseSubscriptionOptions<Types.CountdownSubscription['countdown']>,
): UseSubscriptionReturn<Types.CountdownSubscription['countdown']> {
  return createUseSubscription<Types.CountdownSubscription['countdown'], Types.CountdownSubscriptionVariables>(
    CountdownDocument,
    () => variables,
  )(options)
}

export function useGreetings(
  options?: UseSubscriptionOptions<Types.GreetingsSubscription['greetings']>,
): UseSubscriptionReturn<Types.GreetingsSubscription['greetings']> {
  return createUseSubscription<Types.GreetingsSubscription['greetings'], undefined>(
    GreetingsDocument,
    () => undefined,
  )(options)
}

export function useServerTime(
  options?: UseSubscriptionOptions<Types.ServerTimeSubscription['serverTime']>,
): UseSubscriptionReturn<Types.ServerTimeSubscription['serverTime']> {
  return createUseSubscription<Types.ServerTimeSubscription['serverTime'], undefined>(
    ServerTimeDocument,
    () => undefined,
  )(options)
}

