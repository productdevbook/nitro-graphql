/**
 * Virtual module: #nitro-graphql/pubsub
 * Configures PubSub for subscription event distribution
 */

import type { Nitro } from 'nitro/types'

export const pubsub = {
  id: '#nitro-graphql/pubsub',
  getCode: (nitro: Nitro): string => {
    const subscriptions = nitro.options.graphql?.subscriptions
    const pubsubConfig = subscriptions?.pubsub

    // If subscriptions not enabled, return null pubsub
    if (!subscriptions?.enabled) {
      return `export const pubsub = null`
    }

    // If custom PubSub path is provided, import from there
    if (pubsubConfig?.customPath) {
      return `import customPubSub from '${pubsubConfig.customPath}'
export const pubsub = customPubSub
`
    }

    // Default: use built-in PubSub
    return `import { createPubSub } from 'nitro-graphql/pubsub'
export const pubsub = createPubSub()
`
  },
}
