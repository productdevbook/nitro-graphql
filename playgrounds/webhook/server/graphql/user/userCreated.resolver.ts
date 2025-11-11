import { defineSubscription } from 'nitro-graphql/define'
import { pubsub } from './pubsub'

export const userSubscriptions = defineSubscription({
  userCreated: {
    subscribe: () => {
      console.log('[Subscription] Client subscribed to userCreated')
      return pubsub.subscribe('USER_CREATED')
    },
    resolve: (payload) => {
      console.log('[Subscription] Resolving payload:', payload)
      return payload
    },
  },
})
