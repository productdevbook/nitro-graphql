import type { Peer } from 'crossws'
import type { GraphQLSchema } from 'graphql'
import type { YogaServerInstance } from 'graphql-yoga'
import type { GraphQLWSMessage } from '../utils/ws-protocol'
import { importedConfig } from '#nitro-graphql/graphql-config'
import defu from 'defu'
import { createYoga } from 'graphql-yoga'
import { defineWebSocketHandler } from 'h3'
import {
  cleanupSubscriptions,
  devLog,

  handleComplete,
  handleConnectionInit,
  handlePing,
  handleSubscribe,
  sendMessage,
} from '../utils/ws-protocol'
import { createMergedSchema } from '../utils/ws-schema'

let schema: GraphQLSchema
let yoga: YogaServerInstance<object, object>

async function getSchema() {
  if (!schema) {
    schema = await createMergedSchema()

    // Create Yoga instance for validation/plugins
    if (!yoga) {
      yoga = createYoga(defu({
        schema,
        graphqlEndpoint: '/api/graphql',
        landingPage: false,
      }, importedConfig))
    }
  }
  return schema
}

// Store active subscriptions per peer
const peerSubscriptions = new WeakMap<Peer, Map<string, AsyncIterator<any>>>()

export default defineWebSocketHandler({
  upgrade(request) {
    // Handle WebSocket protocol negotiation
    const protocols = request.headers.get('sec-websocket-protocol')
    if (protocols?.includes('graphql-transport-ws')) {
      return {
        headers: {
          'Sec-WebSocket-Protocol': 'graphql-transport-ws',
        },
      }
    }
  },

  async open(peer) {
    devLog('[GraphQL WS] Client connected')
    peerSubscriptions.set(peer, new Map())
  },

  async message(peer, message) {
    try {
      const data = message.text()
      const msg: GraphQLWSMessage = JSON.parse(data)

      const schema = await getSchema()
      const subscriptions = peerSubscriptions.get(peer)

      if (!subscriptions) {
        console.error('[GraphQL WS] No subscriptions map found for peer')
        return
      }

      switch (msg.type) {
        case 'connection_init':
          handleConnectionInit(peer)
          break

        case 'ping':
          handlePing(peer)
          break

        case 'subscribe':
          await handleSubscribe(peer, msg, schema, subscriptions)
          break

        case 'complete':
          await handleComplete(msg, subscriptions)
          break

        default:
          devLog('[GraphQL WS] Unknown message type:', msg.type)
      }
    }
    catch (error) {
      console.error('[GraphQL WS] Message handling error:', error)
      sendMessage(peer, {
        type: 'error',
        payload: [{ message: 'Invalid message format' }],
      })
    }
  },

  async close(peer, details) {
    devLog('[GraphQL WS] Client disconnected:', details)

    // Clean up all subscriptions for this peer
    const subscriptions = peerSubscriptions.get(peer)
    if (subscriptions) {
      await cleanupSubscriptions(subscriptions)
    }
    peerSubscriptions.delete(peer)
  },

  async error(peer, error) {
    console.error('[GraphQL WS] WebSocket error:', error)
  },
})
