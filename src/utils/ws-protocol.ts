import type { Peer } from 'crossws'
import type { GraphQLSchema } from 'graphql'
import { parse, subscribe, validate } from 'graphql'

// Development-only logging
const isDev = process.env.NODE_ENV === 'development'

export function devLog(message: string, ...args: any[]) {
  if (isDev)
    console.log(message, ...args)
}

// GraphQL-WS protocol message types
export interface GraphQLWSMessage {
  id?: string
  type: string
  payload?: any
}

// Efficient message sending
export function sendMessage(peer: Peer, message: Record<string, any>) {
  peer.send(JSON.stringify(message))
}

export function sendErrorMessage(peer: Peer, id: string | undefined, errors: Array<{ message: string, locations?: any, path?: any }>) {
  sendMessage(peer, {
    id,
    type: 'error',
    payload: errors,
  })
}

export function sendNextMessage(peer: Peer, id: string, payload: any) {
  sendMessage(peer, {
    id,
    type: 'next',
    payload,
  })
}

export function sendCompleteMessage(peer: Peer, id: string) {
  sendMessage(peer, {
    id,
    type: 'complete',
  })
}

// Connection init handler
export function handleConnectionInit(peer: Peer) {
  sendMessage(peer, { type: 'connection_ack' })
}

// Ping handler
export function handlePing(peer: Peer) {
  sendMessage(peer, { type: 'pong' })
}

// Subscribe handler
export async function handleSubscribe(
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

    // Parse and validate the query
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

    // Execute subscription
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
            sendNextMessage(peer, msg.id!, value)
          }

          // Subscription completed
          sendCompleteMessage(peer, msg.id!)
          subscriptions.delete(msg.id!)
        }
        catch (error) {
          console.error('[GraphQL WS] Subscription error:', error)
          sendErrorMessage(peer, msg.id!, [{ message: error instanceof Error ? error.message : 'Subscription error' }])
          subscriptions.delete(msg.id!)
        }
      })()
    }
    else {
      // It's a regular query/mutation result
      sendNextMessage(peer, msg.id, result)
      sendCompleteMessage(peer, msg.id)
    }
  }
  catch (error) {
    console.error('[GraphQL WS] Operation error:', error)
    sendErrorMessage(peer, msg.id!, [{ message: error instanceof Error ? error.message : 'Operation failed' }])
  }
}

// Complete handler
export async function handleComplete(
  msg: GraphQLWSMessage,
  subscriptions: Map<string, AsyncIterator<any>>,
) {
  if (!msg.id)
    return

  // Cancel active subscription
  const iterator = subscriptions.get(msg.id)
  if (iterator && typeof iterator.return === 'function') {
    await iterator.return()
  }
  subscriptions.delete(msg.id)
}

// Cleanup all subscriptions for a peer
export async function cleanupSubscriptions(subscriptions: Map<string, AsyncIterator<any>>) {
  for (const [id, iterator] of subscriptions.entries()) {
    if (typeof iterator.return === 'function') {
      try {
        await iterator.return()
      }
      catch (error) {
        console.error(`[GraphQL WS] Error cleaning up subscription ${id}:`, error)
      }
    }
  }
  subscriptions.clear()
}
