import type { BaseContext } from '@apollo/server'
import type { Peer } from 'crossws'
import type { GraphQLSchema } from 'graphql'
import { importedConfig } from '#nitro-internal-virtual/graphql-config'
import { moduleConfig } from '#nitro-internal-virtual/module-config'
import { directives } from '#nitro-internal-virtual/server-directives'
import { resolvers } from '#nitro-internal-virtual/server-resolvers'
import { schemas } from '#nitro-internal-virtual/server-schemas'
import { ApolloServer } from '@apollo/server'
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import defu from 'defu'
import { parse, subscribe, validate } from 'graphql'
import { defineWebSocketHandler } from 'h3'

// Development-only logging
const isDev = process.env.NODE_ENV === 'development'

function devLog(message: string, ...args: any[]) {
  if (isDev)
    // eslint-disable-next-line no-console
    console.log(message, ...args)
}

// GraphQL-WS protocol message types
interface GraphQLWSMessage {
  id?: string
  type: string
  payload?: any
}

// Message sending utilities
function sendMessage(peer: Peer, message: Record<string, any>) {
  peer.send(JSON.stringify(message))
}

function sendErrorMessage(peer: Peer, id: string | undefined, errors: Array<{ message: string, locations?: any, path?: any }>) {
  sendMessage(peer, { id, type: 'error', payload: errors })
}

function sendNextMessage(peer: Peer, id: string, payload: any) {
  sendMessage(peer, { id, type: 'next', payload })
}

function sendCompleteMessage(peer: Peer, id: string) {
  sendMessage(peer, { id, type: 'complete' })
}

// Protocol handlers
function handleConnectionInit(peer: Peer) {
  sendMessage(peer, { type: 'connection_ack' })
}

function handlePing(peer: Peer) {
  sendMessage(peer, { type: 'pong' })
}

async function handleSubscribe(
  peer: Peer,
  msg: GraphQLWSMessage,
  schema: GraphQLSchema,
  subscriptions: Map<string, AsyncIterator<any>>,
) {
  if (!msg.id || !msg.payload) {
    sendErrorMessage(peer, msg.id, [{ message: 'Invalid subscribe message' }])
    return
  }

  try {
    const { query, variables, operationName } = msg.payload
    const document = typeof query === 'string' ? parse(query) : query
    const validationErrors = validate(schema, document)

    if (validationErrors.length > 0) {
      sendErrorMessage(peer, msg.id, validationErrors.map(err => ({
        message: err.message,
        locations: err.locations,
        path: err.path,
      })))
      return
    }

    const result = await subscribe({
      schema,
      document,
      variableValues: variables,
      operationName,
      contextValue: {},
    })

    if (Symbol.asyncIterator in result) {
      subscriptions.set(msg.id, result)

      ;(async () => {
        try {
          for await (const value of result) {
            sendNextMessage(peer, msg.id!, value)
          }
          sendCompleteMessage(peer, msg.id!)
          subscriptions.delete(msg.id!)
        }
        catch (error) {
          console.error('[Apollo WS] Subscription error:', error)
          sendErrorMessage(peer, msg.id!, [{ message: error instanceof Error ? error.message : 'Subscription error' }])
          subscriptions.delete(msg.id!)
        }
      })()
    }
    else {
      sendNextMessage(peer, msg.id, result)
      sendCompleteMessage(peer, msg.id)
    }
  }
  catch (error) {
    console.error('[Apollo WS] Operation error:', error)
    sendErrorMessage(peer, msg.id!, [{ message: error instanceof Error ? error.message : 'Operation failed' }])
  }
}

async function handleComplete(
  msg: GraphQLWSMessage,
  subscriptions: Map<string, AsyncIterator<any>>,
) {
  if (!msg.id)
    return

  const iterator = subscriptions.get(msg.id)
  if (iterator && typeof iterator.return === 'function') {
    await iterator.return()
  }
  subscriptions.delete(msg.id)
}

async function cleanupSubscriptions(subscriptions: Map<string, AsyncIterator<any>>) {
  for (const [id, iterator] of subscriptions.entries()) {
    if (typeof iterator.return === 'function') {
      try {
        await iterator.return()
      }
      catch (error) {
        console.error(`[Apollo WS] Error cleaning up subscription ${id}:`, error)
      }
    }
  }
  subscriptions.clear()
}

// Schema creation
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

async function createMergedSchema(): Promise<GraphQLSchema> {
  const mergedSchemas = schemas.map(schema => schema.def).join('\n\n')
  const typeDefs = mergeTypeDefs([mergedSchemas], {
    throwOnConflict: true,
    commentDescriptions: true,
    sort: true,
  })
  const mergedResolvers = mergeResolvers(resolvers.map(r => r.resolver))

  const federationEnabled = moduleConfig.federation?.enabled
  let schema: GraphQLSchema

  if (federationEnabled) {
    const buildSubgraph = await loadFederationSupport()

    if (buildSubgraph) {
      const typeDefsDoc = typeof typeDefs === 'string' ? parse(typeDefs) : typeDefs
      schema = buildSubgraph({ typeDefs: typeDefsDoc, resolvers: mergedResolvers })
    }
    else {
      console.warn('[Apollo WS] Federation enabled but @apollo/subgraph not available')
      schema = makeExecutableSchema({ typeDefs, resolvers: mergedResolvers })
    }
  }
  else {
    schema = makeExecutableSchema({ typeDefs, resolvers: mergedResolvers })
  }

  if (directives && directives.length > 0) {
    for (const { directive } of directives) {
      if (directive.transformer) {
        schema = directive.transformer(schema)
      }
    }
  }

  return schema
}

// Handler state
let schema: GraphQLSchema
let apolloServer: ApolloServer<BaseContext> | null = null

async function getSchema() {
  if (!schema) {
    schema = await createMergedSchema()

    if (!apolloServer) {
      apolloServer = new ApolloServer<BaseContext>(defu({
        schema,
        introspection: true,
      }, importedConfig))
      await apolloServer.start()
    }
  }
  return schema
}

const peerSubscriptions = new WeakMap<Peer, Map<string, AsyncIterator<any>>>()

export default defineWebSocketHandler({
  async open(peer) {
    devLog('[Apollo WS] Client connected')
    peerSubscriptions.set(peer, new Map())
  },

  async message(peer, message) {
    try {
      const data = message.text()
      const msg: GraphQLWSMessage = JSON.parse(data)

      const currentSchema = await getSchema()
      const subscriptions = peerSubscriptions.get(peer)

      if (!subscriptions) {
        console.error('[Apollo WS] No subscriptions map found for peer')
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
          await handleSubscribe(peer, msg, currentSchema, subscriptions)
          break
        case 'complete':
          await handleComplete(msg, subscriptions)
          break
        default:
          devLog('[Apollo WS] Unknown message type:', msg.type)
      }
    }
    catch (error) {
      console.error('[Apollo WS] Message handling error:', error)
      sendMessage(peer, {
        type: 'error',
        payload: [{ message: 'Invalid message format' }],
      })
    }
  },

  async close(peer, details) {
    devLog('[Apollo WS] Client disconnected:', details)

    const subscriptions = peerSubscriptions.get(peer)
    if (subscriptions) {
      await cleanupSubscriptions(subscriptions)
    }
    peerSubscriptions.delete(peer)
  },

  async error(peer, error) {
    console.error('[Apollo WS] WebSocket error:', error)
  },
})
