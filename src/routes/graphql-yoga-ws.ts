import type { Peer } from 'crossws'
import type { DocumentNode, ExecutionResult, GraphQLSchema, SourceLocation } from 'graphql'
import { importedConfig } from '#nitro-internal-virtual/graphql-config'
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

function devLog(message: string, ...args: unknown[]) {
  if (isDev)
    // eslint-disable-next-line no-console
    console.log(message, ...args)
}

// ============================================================================
// Types
// ============================================================================

const DEFAULT_MAX_SUBSCRIPTIONS_PER_PEER = 20
const DEFAULT_PING_INTERVAL_MS = 15000
const DEFAULT_PONG_TIMEOUT_MS = 5000

// GraphQL-WS protocol message types
interface SubscribePayload {
  query: string | DocumentNode
  variables?: Record<string, unknown>
  operationName?: string
}

interface GraphQLWSMessage {
  id?: string
  type: string
  payload?: SubscribePayload | Record<string, unknown> | undefined
}

interface GraphQLWSError {
  message: string
  locations?: readonly SourceLocation[]
  path?: readonly (string | number)[]
}

// Tracked subscription with AbortController for proper cleanup
interface TrackedSubscription {
  iterator: AsyncIterator<ExecutionResult>
  abortController: AbortController
}

// Message sending utilities
function sendMessage(peer: Peer, message: Record<string, unknown>) {
  peer.send(JSON.stringify(message))
}

function sendErrorMessage(peer: Peer, id: string | undefined, errors: GraphQLWSError[]) {
  sendMessage(peer, { id, type: 'error', payload: errors })
}

function sendNextMessage(peer: Peer, id: string, payload: ExecutionResult) {
  sendMessage(peer, { id, type: 'next', payload })
}

function sendCompleteMessage(peer: Peer, id: string) {
  sendMessage(peer, { id, type: 'complete' })
}

// Protocol handlers
async function handleConnectionInit(peer: Peer, payload?: Record<string, unknown>) {
  if (payload) {
    peer.context.connectionParams = payload
  }

  // S5: onConnect validation callback (async supported)
  const onConnect = importedConfig?.websocket?.onConnect
  if (onConnect) {
    try {
      const connectionContext = {
        connectionParams: payload || {},
        headers: Object.fromEntries(peer.request.headers.entries()),
        peerId: peer.id,
        remoteAddress: peer.remoteAddress,
      }

      const result = await onConnect(connectionContext)

      // If onConnect returns false or throws, reject the connection
      if (result === false) {
        sendMessage(peer, {
          type: 'connection_error',
          payload: { message: 'Connection rejected by server' },
        })
        peer.close()
        return
      }

      // If onConnect returns an object, merge it into connection context
      if (result && typeof result === 'object') {
        peer.context.connectionContext = result
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection validation failed'
      sendMessage(peer, {
        type: 'connection_error',
        payload: { message: errorMessage },
      })
      peer.close()
      return
    }
  }

  sendMessage(peer, { type: 'connection_ack' })
  // Start server-initiated keep-alive
  startKeepAlive(peer)
}

function handlePing(peer: Peer) {
  sendMessage(peer, { type: 'pong' })
}

function handlePong(peer: Peer) {
  // Client responded to our ping - clear timeout
  if (peer.context.pongTimeout) {
    clearTimeout(peer.context.pongTimeout as ReturnType<typeof setTimeout>)
    peer.context.pongTimeout = null
  }
}

// Server-initiated keep-alive
function startKeepAlive(peer: Peer) {
  stopKeepAlive(peer) // Clear any existing

  peer.context.pingInterval = setInterval(() => {
    sendMessage(peer, { type: 'ping' })

    // Set timeout for pong response
    peer.context.pongTimeout = setTimeout(() => {
      devLog('[GraphQL WS] Peer did not respond to ping, closing connection')
      peer.close()
    }, DEFAULT_PONG_TIMEOUT_MS)
  }, DEFAULT_PING_INTERVAL_MS)
}

function stopKeepAlive(peer: Peer) {
  if (peer.context.pingInterval) {
    clearInterval(peer.context.pingInterval as ReturnType<typeof setInterval>)
    peer.context.pingInterval = null
  }
  if (peer.context.pongTimeout) {
    clearTimeout(peer.context.pongTimeout as ReturnType<typeof setTimeout>)
    peer.context.pongTimeout = null
  }
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

  const subscriptions = peer.context.subscriptions as Map<string, TrackedSubscription>
  const connectionParams = peer.context.connectionParams as Record<string, unknown> | undefined
  const connectionContext = peer.context.connectionContext as Record<string, unknown> | undefined

  // Check for duplicate subscription ID
  if (subscriptions.has(msg.id)) {
    sendErrorMessage(peer, msg.id, [{ message: `Subscription with ID "${msg.id}" already exists` }])
    return
  }

  // Check subscription limit
  if (subscriptions.size >= DEFAULT_MAX_SUBSCRIPTIONS_PER_PEER) {
    sendErrorMessage(peer, msg.id, [{ message: `Maximum subscriptions limit (${DEFAULT_MAX_SUBSCRIPTIONS_PER_PEER}) reached` }])
    return
  }

  try {
    const payload = msg.payload as SubscribePayload
    const { query, variables, operationName } = payload
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

    // Build context with connectionParams, connectionContext, and HTTP headers
    const contextValue: Record<string, unknown> = {
      connectionParams,
      ...connectionContext, // Spread onConnect result
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
      // S2: Create AbortController to track this subscription
      const abortController = new AbortController()
      const trackedSub: TrackedSubscription = {
        iterator: result,
        abortController,
      }
      subscriptions.set(msg.id, trackedSub)

      // S2: Tracked async iteration with AbortController
      const iterateSubscription = async () => {
        const subscriptionId = msg.id!
        const signal = abortController.signal

        try {
          for await (const value of result) {
            // Check if aborted before sending
            if (signal.aborted) {
              break
            }
            sendNextMessage(peer, subscriptionId, value)
          }

          // Only send complete if not aborted
          if (!signal.aborted) {
            sendCompleteMessage(peer, subscriptionId)
          }
        }
        catch (error) {
          // Ignore abort errors
          if (signal.aborted) {
            return
          }
          console.error('[GraphQL WS] Subscription error:', error)
          sendErrorMessage(peer, subscriptionId, [{
            message: error instanceof Error ? error.message : 'Subscription error',
          }])
        }
        finally {
          subscriptions.delete(subscriptionId)
        }
      }

      // Start iteration (tracked, not fire-and-forget)
      iterateSubscription()
    }
    else {
      sendNextMessage(peer, msg.id, result)
      sendCompleteMessage(peer, msg.id)
    }
  }
  catch (error) {
    console.error('[GraphQL WS] Operation error:', error)
    sendErrorMessage(peer, msg.id!, [{ message: error instanceof Error ? error.message : 'Operation failed' }])
  }
}

async function handleComplete(
  peer: Peer,
  msg: GraphQLWSMessage,
) {
  if (!msg.id)
    return

  const subscriptions = peer.context.subscriptions as Map<string, TrackedSubscription>
  const tracked = subscriptions.get(msg.id)
  if (tracked) {
    // S2: Abort first to stop iteration, then return iterator
    tracked.abortController.abort()
    if (typeof tracked.iterator.return === 'function') {
      try {
        await tracked.iterator.return()
      }
      catch {
        // Ignore errors during cleanup
      }
    }
    subscriptions.delete(msg.id)
  }
}

async function cleanupSubscriptions(peer: Peer, sendComplete = false) {
  const subscriptions = peer.context.subscriptions as Map<string, TrackedSubscription> | undefined
  if (!subscriptions)
    return

  // Graceful shutdown: send complete messages before cleanup
  for (const [id, tracked] of subscriptions.entries()) {
    // Try to send complete message (may fail if connection already closed)
    if (sendComplete) {
      try {
        sendCompleteMessage(peer, id)
      }
      catch {
        // Ignore send errors during cleanup
      }
    }

    // S2: Abort to stop iteration, then return iterator
    tracked.abortController.abort()
    if (typeof tracked.iterator.return === 'function') {
      try {
        await tracked.iterator.return()
      }
      catch (error) {
        console.error(`[GraphQL WS] Error cleaning up subscription ${id}:`, error)
      }
    }
  }
  subscriptions.clear()
}

// Schema creation
// Type for buildSubgraphSchema - optional @apollo/subgraph dependency
type BuildSubgraphSchemaFn = typeof import('@apollo/subgraph').buildSubgraphSchema
let buildSubgraphSchema: BuildSubgraphSchemaFn | false | null = null

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
      schema = buildSubgraph({ typeDefs: typeDefsDoc, resolvers: mergedResolvers as any })
    }
    else {
      console.warn('[GraphQL WS] Federation enabled but @apollo/subgraph not available')
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

// Handler state - using Promise lock to prevent race conditions
let schemaPromise: Promise<GraphQLSchema> | null = null

async function getSchema(): Promise<GraphQLSchema> {
  // Use Promise caching to prevent multiple concurrent schema creations
  if (!schemaPromise) {
    schemaPromise = createMergedSchema()
  }
  return schemaPromise
}

export default defineWebSocketHandler({
  async open(peer) {
    devLog('[GraphQL WS] Client connected')
    peer.context.subscriptions = new Map<string, TrackedSubscription>()
  },

  async message(peer, message) {
    try {
      const data = message.text()
      const msg: GraphQLWSMessage = JSON.parse(data)

      const currentSchema = await getSchema()

      switch (msg.type) {
        case 'connection_init':
          await handleConnectionInit(peer, msg.payload as Record<string, unknown> | undefined)
          break
        case 'ping':
          handlePing(peer)
          break
        case 'pong':
          handlePong(peer)
          break
        case 'subscribe':
          await handleSubscribe(peer, msg, currentSchema)
          break
        case 'complete':
          await handleComplete(peer, msg)
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
    stopKeepAlive(peer)
    // Graceful shutdown: try to send complete messages before cleanup
    await cleanupSubscriptions(peer, true)
  },

  async error(_peer, error) {
    console.error('[GraphQL WS] WebSocket error:', error)
  },
})
