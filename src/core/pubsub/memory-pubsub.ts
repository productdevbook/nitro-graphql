/**
 * Built-in PubSub implementation for GraphQL Subscriptions
 * Simple EventEmitter-based implementation for single-instance deployments
 *
 * For multi-instance deployments, use external PubSub solutions like:
 * - Redis (with ioredis)
 * - Kafka
 * - RabbitMQ
 * - Cloud Pub/Sub services
 */

import { EventEmitter } from 'node:events'

/**
 * Generic PubSub engine interface
 * Compatible with various PubSub implementations
 */
export interface PubSubEngine<Topics extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Publish an event to a topic
   * @param topic - Topic name to publish to
   * @param payload - Event payload
   */
  publish: <K extends keyof Topics>(topic: K, payload: Topics[K]) => Promise<void>

  /**
   * Subscribe to a topic
   * @param topic - Topic name to subscribe to
   * @returns AsyncIterable that yields events
   */
  subscribe: <K extends keyof Topics>(topic: K) => AsyncIterable<Topics[K]>
}

/**
 * Type alias for typed PubSub instances
 */
export type TypedPubSub<Topics extends Record<string, unknown>> = PubSubEngine<Topics>

/**
 * Create a simple in-memory PubSub instance
 *
 * This implementation uses EventEmitter for lightweight pub/sub functionality.
 * Suitable for:
 * - Development environments
 * - Single-instance production deployments
 * - Testing
 *
 * NOT suitable for:
 * - Multi-instance/clustered deployments (events won't propagate across instances)
 * - High-throughput scenarios (consider Redis-based PubSub)
 *
 * @example
 * ```typescript
 * // Define your topic types
 * interface MyTopics {
 *   'user:created': { id: string; name: string }
 *   'message:sent': { channelId: string; content: string }
 * }
 *
 * // Create typed PubSub instance
 * const pubsub = createPubSub<MyTopics>()
 *
 * // Publish events
 * await pubsub.publish('user:created', { id: '123', name: 'John' })
 *
 * // Subscribe to events (in a resolver)
 * export const userSubscriptions = defineSubscription({
 *   userCreated: {
 *     subscribe: async function* () {
 *       yield* pubsub.subscribe('user:created')
 *     }
 *   }
 * })
 * ```
 */
export function createPubSub<
  Topics extends Record<string, unknown> = Record<string, unknown>,
>(): PubSubEngine<Topics> {
  const emitter = new EventEmitter()
  // Allow unlimited listeners to prevent warnings with many subscriptions
  emitter.setMaxListeners(0)

  return {
    async publish<K extends keyof Topics>(topic: K, payload: Topics[K]): Promise<void> {
      emitter.emit(String(topic), payload)
    },

    subscribe<K extends keyof Topics>(topic: K): AsyncIterable<Topics[K]> {
      const topicStr = String(topic)

      return {
        [Symbol.asyncIterator](): AsyncIterator<Topics[K]> {
          const queue: Topics[K][] = []
          let resolve: ((value: IteratorResult<Topics[K]>) => void) | null = null
          let done = false

          const listener = (payload: Topics[K]): void => {
            if (resolve) {
              resolve({ value: payload, done: false })
              resolve = null
            }
            else {
              queue.push(payload)
            }
          }

          emitter.on(topicStr, listener)

          return {
            next(): Promise<IteratorResult<Topics[K]>> {
              if (done) {
                return Promise.resolve({ value: undefined as unknown as Topics[K], done: true })
              }
              if (queue.length > 0) {
                return Promise.resolve({ value: queue.shift()!, done: false })
              }
              return new Promise((r) => {
                resolve = r
              })
            },

            return(): Promise<IteratorResult<Topics[K]>> {
              done = true
              emitter.off(topicStr, listener)
              return Promise.resolve({ value: undefined as unknown as Topics[K], done: true })
            },

            throw(error: Error): Promise<IteratorResult<Topics[K]>> {
              done = true
              emitter.off(topicStr, listener)
              return Promise.reject(error)
            },
          }
        },
      }
    },
  }
}

/**
 * Filter subscription events based on a predicate
 *
 * @example
 * ```typescript
 * export const chatSubscriptions = defineSubscription({
 *   messageAdded: {
 *     subscribe: async function* (_, { channelId }) {
 *       yield* withFilter(
 *         pubsub.subscribe('message:added'),
 *         (message) => message.channelId === channelId
 *       )
 *     }
 *   }
 * })
 * ```
 */
export async function* withFilter<T>(
  asyncIterable: AsyncIterable<T>,
  filter: (value: T) => boolean | Promise<boolean>,
): AsyncIterable<T> {
  for await (const value of asyncIterable) {
    if (await filter(value)) {
      yield value
    }
  }
}

/**
 * Map subscription events to a different shape
 *
 * @example
 * ```typescript
 * export const chatSubscriptions = defineSubscription({
 *   messageAdded: {
 *     subscribe: async function* () {
 *       yield* mapAsyncIterator(
 *         pubsub.subscribe('message:added'),
 *         (event) => ({ messageAdded: event.message })
 *       )
 *     }
 *   }
 * })
 * ```
 */
export async function* mapAsyncIterator<T, U>(
  asyncIterable: AsyncIterable<T>,
  mapper: (value: T) => U | Promise<U>,
): AsyncIterable<U> {
  for await (const value of asyncIterable) {
    yield await mapper(value)
  }
}
