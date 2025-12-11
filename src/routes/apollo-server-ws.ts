import type { Peer } from 'crossws'
import type { GraphQLSchema } from 'graphql'
import { moduleConfig } from '#nitro-internal-virtual/module-config'
import { directives } from '#nitro-internal-virtual/server-directives'
import { resolvers } from '#nitro-internal-virtual/server-resolvers'
import { schemas } from '#nitro-internal-virtual/server-schemas'
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
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
function handleConnectionInit(peer: Peer, payload?: Record<string, unknown>) {
  if (payload) {
    peer.context.connectionParams = payload
  }
  sendMessage(peer, { type: 'connection_ack' })
}

function handlePing(peer: Peer) {
  sendMessage(peer, { type: 'pong' })
}

async function handleSubscribe(
  peer: Peer,
  msg: GraphQLWSMessage,
  schema: GraphQLSchema,
) {
  if (!msg.id || !msg.payload) {
    sendErrorMessage(peer, msg.id, [{ message: 'Invalid subscribe message' }])
    return
  }

  const subscriptions = peer.context.subscriptions as Map<string, AsyncIterator<any>>
  const connectionParams = peer.context.connectionParams as Record<string, unknown> | undefined

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

    // Build context with connectionParams and HTTP headers from upgrade request
    const contextValue: Record<string, unknown> = {
      connectionParams,
      headers: Object.fromEntries(peer.request.headers.entries()),
      authorization: peer.request.headers.get('authorization') || connectionParams?.authorization,
      peerId: peer.id,
      remoteAddress: peer.remoteAddress,
    }

    const result = await subscribe({
      schema,
      document,
      variableValues: variables,
      operationName,
      contextValue,
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
  peer: Peer,
  msg: GraphQLWSMessage,
) {
  if (!msg.id)
    return

  const subscriptions = peer.context.subscriptions as Map<string, AsyncIterator<any>>
  const iterator = subscriptions.get(msg.id)
  if (iterator && typeof iterator.return === 'function') {
    await iterator.return()
  }
  subscriptions.delete(msg.id)
}

async function cleanupSubscriptions(peer: Peer) {
  const subscriptions = peer.context.subscriptions as Map<string, AsyncIterator<any>> | undefined
  if (!subscriptions)
    return

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

async function getSchema() {
  if (!schema) {
    schema = await createMergedSchema()
  }
  return schema
}

export default defineWebSocketHandler({
  async open(peer) {
    devLog('[Apollo WS] Client connected')
    peer.context.subscriptions = new Map<string, AsyncIterator<any>>()
  },

  async message(peer, message) {
    try {
      const data = message.text()
      const msg: GraphQLWSMessage = JSON.parse(data)

      const currentSchema = await getSchema()

      switch (msg.type) {
        case 'connection_init':
          handleConnectionInit(peer, msg.payload)
          break
        case 'ping':
          handlePing(peer)
          break
        case 'subscribe':
          await handleSubscribe(peer, msg, currentSchema)
          break
        case 'complete':
          await handleComplete(peer, msg)
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
    await cleanupSubscriptions(peer)
  },

  async error(_peer, error) {
    console.error('[Apollo WS] WebSocket error:', error)
  },
})
