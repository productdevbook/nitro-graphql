/**
 * E2E tests for GraphQL Subscriptions
 *
 * This test actually builds and starts a Nitro server,
 * then tests real WebSocket subscription connections.
 */
import type { Nitro } from 'nitro/types'
import { createClient } from 'graphql-ws'
import { build, createDevServer, createNitro, prepare } from 'nitro/builder'
import { resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import graphql from '../../src'

const TRAILING_SLASH_RE = /\/$/

const fixturesDir = resolve(__dirname, '../fixtures')

describe('graphQL Subscriptions E2E', () => {
  let nitro: Nitro
  let devServer: ReturnType<typeof createDevServer>
  let serverUrl: string
  let wsUrl: string

  beforeAll(async () => {
    // Create Nitro instance with subscriptions enabled
    nitro = await createNitro({
      rootDir: resolve(fixturesDir, 'subscription-project'),
      dev: true,
      modules: [
        graphql({
          framework: 'graphql-yoga',
          subscriptions: { enabled: true },
          types: { enabled: false },
        }),
      ],
    })

    await prepare(nitro)
    await build(nitro)

    // Create and start dev server
    devServer = createDevServer(nitro)
    const server = await devServer.listen({ port: 0 }) // Random available port

    // Server from srvx has url property
    const url = server.url || `http://localhost:${(server as unknown as { port: number }).port}`
    serverUrl = url.replace(TRAILING_SLASH_RE, '') // Remove trailing slash
    wsUrl = `${serverUrl.replace('http', 'ws')}/api/graphql/ws`
  }, 60000) // Increased timeout for build

  afterAll(async () => {
    await devServer?.close()
    await nitro?.close()
  })

  describe('hTTP GraphQL endpoint', () => {
    it('should respond to GraphQL queries', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ messages { id content } }',
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.data).toBeDefined()
      expect(data.data.messages).toBeInstanceOf(Array)
    })

    it('should handle mutations', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mutation { sendMessage(content: "Hello E2E") { id content } }',
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.data.sendMessage.content).toBe('Hello E2E')
    })
  })

  describe('webSocket subscriptions', () => {
    it('should establish WebSocket connection', async () => {
      const client = createClient({
        url: wsUrl,
        webSocketImpl: WebSocket,
      })

      // Test connection by subscribing and immediately unsubscribing
      const subscription = client.subscribe(
        { query: 'subscription { messageAdded { id } }' },
        {
          next: () => {},
          error: () => {},
          complete: () => {},
        },
      )

      // Give it a moment to connect
      await new Promise(r => setTimeout(r, 100))

      // Unsubscribe
      subscription()
      client.dispose()
    })

    it('should receive subscription data when mutation triggers event', async () => {
      const client = createClient({
        url: wsUrl,
        webSocketImpl: WebSocket,
      })

      const receivedMessages: Array<{ id: string, content: string }> = []
      let resolvePromise: () => void
      const messageReceived = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })

      // Start subscription
      const unsubscribe = client.subscribe(
        { query: 'subscription { messageAdded { id content } }' },
        {
          next: (result) => {
            if (result.data?.messageAdded) {
              receivedMessages.push(result.data.messageAdded as { id: string, content: string })
              resolvePromise()
            }
          },
          error: (err) => {
            console.error('Subscription error:', err)
          },
          complete: () => {},
        },
      )

      // Wait for subscription to be established
      await new Promise(r => setTimeout(r, 200))

      // Send a message via mutation
      const mutationResponse = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mutation { sendMessage(content: "WebSocket Test Message") { id content } }',
        }),
      })

      expect(mutationResponse.ok).toBe(true)

      // Wait for subscription to receive the message
      await Promise.race([
        messageReceived,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for subscription')), 5000)),
      ])

      expect(receivedMessages.length).toBeGreaterThan(0)
      expect(receivedMessages[0].content).toBe('WebSocket Test Message')

      // Cleanup
      unsubscribe()
      client.dispose()
    })

    it('should handle multiple concurrent subscriptions', async () => {
      const client = createClient({
        url: wsUrl,
        webSocketImpl: WebSocket,
      })

      const messages1: unknown[] = []
      const messages2: unknown[] = []

      // Start two subscriptions
      const unsub1 = client.subscribe(
        { query: 'subscription { messageAdded { id } }' },
        {
          next: (result) => {
            if (result.data?.messageAdded) {
              messages1.push(result.data.messageAdded)
            }
          },
          error: () => {},
          complete: () => {},
        },
      )

      const unsub2 = client.subscribe(
        { query: 'subscription { messageAdded { content } }' },
        {
          next: (result) => {
            if (result.data?.messageAdded) {
              messages2.push(result.data.messageAdded)
            }
          },
          error: () => {},
          complete: () => {},
        },
      )

      // Wait for subscriptions to establish
      await new Promise(r => setTimeout(r, 200))

      // Send a message
      await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mutation { sendMessage(content: "Multi-sub test") { id } }',
        }),
      })

      // Wait for subscriptions to receive
      await new Promise(r => setTimeout(r, 300))

      // Both subscriptions should have received the message
      expect(messages1.length).toBeGreaterThan(0)
      expect(messages2.length).toBeGreaterThan(0)

      // Cleanup
      unsub1()
      unsub2()
      client.dispose()
    })

    it('should properly unsubscribe', async () => {
      const client = createClient({
        url: wsUrl,
        webSocketImpl: WebSocket,
      })

      const messages: unknown[] = []

      const unsubscribe = client.subscribe(
        { query: 'subscription { messageAdded { id } }' },
        {
          next: (result) => {
            if (result.data?.messageAdded) {
              messages.push(result.data.messageAdded)
            }
          },
          error: () => {},
          complete: () => {},
        },
      )

      // Wait for subscription to establish
      await new Promise(r => setTimeout(r, 200))

      // Unsubscribe
      unsubscribe()

      // Send a message after unsubscribing
      await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mutation { sendMessage(content: "After unsub") { id } }',
        }),
      })

      // Wait a bit
      await new Promise(r => setTimeout(r, 300))

      // Should NOT have received the message after unsubscribing
      const afterUnsubCount = messages.length
      expect(afterUnsubCount).toBe(0) // No messages should be received after unsubscribe

      client.dispose()
    })
  })

  describe('countdown subscription', () => {
    it('should receive countdown values', async () => {
      const client = createClient({
        url: wsUrl,
        webSocketImpl: WebSocket,
      })

      const values: number[] = []
      let resolveComplete: () => void
      const completed = new Promise<void>((resolve) => {
        resolveComplete = resolve
      })

      client.subscribe(
        { query: 'subscription { countdown(from: 3) }' },
        {
          next: (result) => {
            if (result.data?.countdown !== undefined) {
              values.push(result.data.countdown as number)
            }
          },
          error: (err) => {
            console.error('Countdown error:', err)
          },
          complete: () => {
            resolveComplete()
          },
        },
      )

      // Wait for countdown to complete (3 seconds + buffer)
      await Promise.race([
        completed,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Countdown timeout')), 5000)),
      ])

      // Should have received countdown values
      expect(values.length).toBeGreaterThanOrEqual(3)
      expect(values).toContain(3)
      expect(values).toContain(2)
      expect(values).toContain(1)

      client.dispose()
    })
  })
})
