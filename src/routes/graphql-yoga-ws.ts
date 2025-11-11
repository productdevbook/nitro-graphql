import type { Peer } from 'crossws'
import type { GraphQLSchema } from 'graphql'
import type { YogaServerInstance } from 'graphql-yoga'
import { importedConfig } from '#nitro-graphql/graphql-config'
import { moduleConfig } from '#nitro-graphql/module-config'
import { directives } from '#nitro-graphql/server-directives'
import { resolvers } from '#nitro-graphql/server-resolvers'
import { schemas } from '#nitro-graphql/server-schemas'

import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { consola } from 'consola'
import defu from 'defu'
import { parse, subscribe, validate } from 'graphql'
import { createYoga } from 'graphql-yoga'
import { defineWebSocketHandler } from 'h3'

// Conditional imports for federation support
let buildSubgraphSchema: any = null

async function loadFederationSupport() {
  if (buildSubgraphSchema !== null)
    return buildSubgraphSchema

  try {
    const apolloSubgraph = await import('@apollo/subgraph')
    buildSubgraphSchema = apolloSubgraph.buildSubgraphSchema
  }
  catch {
    buildSubgraphSchema = false
  }

  return buildSubgraphSchema
}

async function createMergedSchema() {
  try {
    const mergedSchemas = schemas.map(schema => schema.def).join('\n\n')
    const typeDefs = mergeTypeDefs([mergedSchemas], {
      throwOnConflict: true,
      commentDescriptions: true,
      sort: true,
    })
    const mergedResolvers = mergeResolvers(resolvers.map(r => r.resolver))

    const federationEnabled = moduleConfig.federation?.enabled

    let schema

    if (federationEnabled) {
      const buildSubgraph = await loadFederationSupport()

      if (buildSubgraph) {
        const typeDefsDoc = typeof typeDefs === 'string' ? parse(typeDefs) : typeDefs

        schema = buildSubgraph({
          typeDefs: typeDefsDoc,
          resolvers: mergedResolvers,
        })
      }
      else {
        console.warn('Federation enabled but @apollo/subgraph not available, falling back to regular schema')
        schema = makeExecutableSchema({
          typeDefs,
          resolvers: mergedResolvers,
        })
      }
    }
    else {
      schema = makeExecutableSchema({
        typeDefs,
        resolvers: mergedResolvers,
      })
    }

    // Apply directives if any
    if (directives && directives.length > 0) {
      for (const { directive } of directives) {
        if (directive.transformer) {
          schema = directive.transformer(schema)
        }
      }
    }

    return schema
  }
  catch (error) {
    consola.error('Schema merge error:', error)
    throw error
  }
}

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

// graphql-ws protocol implementation
interface GraphQLWSMessage {
  id?: string
  type: string
  payload?: any
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
    consola.info('[GraphQL WS] Client connected')
    peerSubscriptions.set(peer, new Map())
  },

  async message(peer, message) {
    try {
      const data = message.text()
      const msg: GraphQLWSMessage = JSON.parse(data)

      const schema = await getSchema()
      const subscriptions = peerSubscriptions.get(peer)

      if (!subscriptions) {
        consola.error('[GraphQL WS] No subscriptions map found for peer')
        return
      }

      switch (msg.type) {
        case 'connection_init': {
          // Acknowledge connection
          peer.send(JSON.stringify({
            type: 'connection_ack',
          }))
          break
        }

        case 'ping': {
          // Respond with pong
          peer.send(JSON.stringify({
            type: 'pong',
          }))
          break
        }

        case 'subscribe': {
          if (!msg.id || !msg.payload) {
            peer.send(JSON.stringify({
              id: msg.id,
              type: 'error',
              payload: [{ message: 'Invalid subscribe message' }],
            }))
            break
          }

          try {
            const { query, variables, operationName } = msg.payload

            // Parse and validate the query
            const document = typeof query === 'string' ? parse(query) : query
            const validationErrors = validate(schema, document)

            if (validationErrors.length > 0) {
              peer.send(JSON.stringify({
                id: msg.id,
                type: 'error',
                payload: validationErrors.map(err => ({
                  message: err.message,
                  locations: err.locations,
                  path: err.path,
                })),
              }))
              break
            }

            // Try to execute as subscription first
            const result = await subscribe({
              schema,
              document,
              variableValues: variables,
              operationName,
              contextValue: {},
            })

            // Check if it's a subscription result (AsyncIterator)
            if (Symbol.asyncIterator in result) {
              subscriptions.set(msg.id, result)

              // Process subscription events
              ;(async () => {
                try {
                  for await (const value of result) {
                    peer.send(JSON.stringify({
                      id: msg.id,
                      type: 'next',
                      payload: value,
                    }))
                  }

                  // Subscription completed
                  peer.send(JSON.stringify({
                    id: msg.id,
                    type: 'complete',
                  }))
                  subscriptions.delete(msg.id)
                }
                catch (error) {
                  consola.error('[GraphQL WS] Subscription error:', error)
                  peer.send(JSON.stringify({
                    id: msg.id,
                    type: 'error',
                    payload: [{ message: error instanceof Error ? error.message : 'Subscription error' }],
                  }))
                  subscriptions.delete(msg.id)
                }
              })()
            }
            else {
              // It's a regular query/mutation result
              peer.send(JSON.stringify({
                id: msg.id,
                type: 'next',
                payload: result,
              }))
              peer.send(JSON.stringify({
                id: msg.id,
                type: 'complete',
              }))
            }
          }
          catch (error) {
            consola.error('[GraphQL WS] Operation error:', error)
            peer.send(JSON.stringify({
              id: msg.id,
              type: 'error',
              payload: [{ message: error instanceof Error ? error.message : 'Operation failed' }],
            }))
          }
          break
        }

        case 'complete': {
          if (!msg.id)
            break

          // Cancel active subscription
          const iterator = subscriptions.get(msg.id)
          if (iterator && typeof iterator.return === 'function') {
            await iterator.return()
          }
          subscriptions.delete(msg.id)
          break
        }

        default: {
          consola.warn('[GraphQL WS] Unknown message type:', msg.type)
        }
      }
    }
    catch (error) {
      consola.error('[GraphQL WS] Message handling error:', error)
      peer.send(JSON.stringify({
        type: 'error',
        payload: [{ message: 'Invalid message format' }],
      }))
    }
  },

  async close(peer, details) {
    consola.info('[GraphQL WS] Client disconnected:', details)

    // Clean up all subscriptions for this peer
    const subscriptions = peerSubscriptions.get(peer)
    if (subscriptions) {
      for (const [id, iterator] of subscriptions.entries()) {
        if (typeof iterator.return === 'function') {
          try {
            await iterator.return()
          }
          catch (error) {
            consola.error(`[GraphQL WS] Error cleaning up subscription ${id}:`, error)
          }
        }
      }
      subscriptions.clear()
    }
    peerSubscriptions.delete(peer)
  },

  async error(peer, error) {
    consola.error('[GraphQL WS] WebSocket error:', error)
  },
})
