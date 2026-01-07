import type {
  ConnectionState,
  SubscriptionClient,
  SubscriptionClientConfig,
  SubscriptionHandle,
  SubscriptionSession,
} from 'nitro-graphql/subscribe'
import { createSubscriptionClient } from 'nitro-graphql/subscribe'

export type { ConnectionState, SubscriptionClient, SubscriptionHandle, SubscriptionSession }

const config: SubscriptionClientConfig = {
  wsEndpoint: '/api/graphql/ws',
  sseEndpoint: '/api/graphql',
  connectionTimeoutMs: 10000,
  maxRetries: 5,
}

export const subscriptionClient = createSubscriptionClient(config)
