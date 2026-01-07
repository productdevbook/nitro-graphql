import type { Client as SseClient } from 'graphql-sse'
/**
 * Tests for the subscription client module
 * Mocks graphql-ws and graphql-sse to test client behavior
 */
import type { Client as WsClient } from 'graphql-ws'
import { createClient as createSseClient } from 'graphql-sse'

// Import after mocks are set up
import { createClient as createWsClient } from 'graphql-ws'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSubscriptionClient } from '../../../src/subscribe'

// Mock graphql-ws
const mockWsSubscribe = vi.fn()
const mockWsDispose = vi.fn()
const mockWsClient: Partial<WsClient> = {
  subscribe: mockWsSubscribe,
  dispose: mockWsDispose,
}

vi.mock('graphql-ws', () => ({
  createClient: vi.fn(() => mockWsClient),
}))

// Mock graphql-sse
const mockSseSubscribe = vi.fn()
const mockSseDispose = vi.fn()
const mockSseClient: Partial<SseClient> = {
  subscribe: mockSseSubscribe,
  dispose: mockSseDispose,
}

vi.mock('graphql-sse', () => ({
  createClient: vi.fn(() => mockSseClient),
}))

describe('createSubscriptionClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations
    mockWsSubscribe.mockImplementation(() => vi.fn())
    mockSseSubscribe.mockImplementation(() => vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('configuration', () => {
    it('should use default endpoints when not specified', () => {
      createSubscriptionClient()

      expect(createWsClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/api/graphql/ws'),
        }),
      )

      expect(createSseClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/api/graphql'),
        }),
      )
    })

    it('should use custom endpoints when specified', () => {
      createSubscriptionClient({
        wsEndpoint: '/custom/ws',
        sseEndpoint: '/custom/sse',
      })

      expect(createWsClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/custom/ws'),
        }),
      )

      expect(createSseClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/custom/sse'),
        }),
      )
    })

    it('should pass connection params to WS client', () => {
      const connectionParams = { token: 'test-token' }
      createSubscriptionClient({ connectionParams })

      expect(createWsClient).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionParams,
        }),
      )
    })

    it('should pass headers to SSE client', () => {
      const sseHeaders = { Authorization: 'Bearer token' }
      createSubscriptionClient({ sseHeaders })

      expect(createSseClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: sseHeaders,
        }),
      )
    })

    it('should use custom timeout and retry settings', () => {
      createSubscriptionClient({
        connectionTimeoutMs: 5000,
        maxRetries: 3,
        keepAlive: 15000,
      })

      expect(createWsClient).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionAckWaitTimeout: 5000,
          retryAttempts: 3,
          keepAlive: 15000,
        }),
      )

      expect(createSseClient).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAttempts: 3,
        }),
      )
    })
  })

  describe('subscribe (WebSocket)', () => {
    it('should create WS subscription by default', () => {
      const client = createSubscriptionClient()
      const onData = vi.fn()
      const onError = vi.fn()

      client.subscribe('subscription { test }', {}, onData, onError)

      expect(mockWsSubscribe).toHaveBeenCalledTimes(1)
      expect(mockSseSubscribe).not.toHaveBeenCalled()
    })

    it('should call onData with extracted payload', () => {
      let capturedSink: { next: (result: unknown) => void } | null = null
      mockWsSubscribe.mockImplementation((_payload, sink) => {
        capturedSink = sink
        return vi.fn()
      })

      const client = createSubscriptionClient()
      const onData = vi.fn()

      client.subscribe('subscription { testField }', {}, onData)

      // Simulate receiving data
      capturedSink?.next({
        data: { testField: { id: 1, name: 'test' } },
      })

      expect(onData).toHaveBeenCalledWith({ id: 1, name: 'test' })
    })

    it('should call onError on GraphQL errors', () => {
      let capturedSink: { next: (result: unknown) => void } | null = null
      mockWsSubscribe.mockImplementation((_payload, sink) => {
        capturedSink = sink
        return vi.fn()
      })

      const client = createSubscriptionClient()
      const onError = vi.fn()

      client.subscribe('subscription { test }', {}, undefined, onError)

      // Simulate GraphQL error
      capturedSink?.next({
        errors: [{ message: 'Test error' }],
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toBe('Test error')
    })

    it('should call onError on connection error', () => {
      let capturedSink: { error: (err: Error) => void } | null = null
      mockWsSubscribe.mockImplementation((_payload, sink) => {
        capturedSink = sink
        return vi.fn()
      })

      const client = createSubscriptionClient()
      const onError = vi.fn()

      client.subscribe('subscription { test }', {}, undefined, onError)

      // Simulate connection error
      capturedSink?.error(new Error('Connection failed'))

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toBe('Connection failed')
    })

    it('should return unsubscribe handle', () => {
      const mockUnsubscribe = vi.fn()
      mockWsSubscribe.mockReturnValue(mockUnsubscribe)

      const client = createSubscriptionClient()
      const handle = client.subscribe('subscription { test }', {})

      expect(handle.unsubscribe).toBeDefined()
      handle.unsubscribe()
      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('should report transport as "websocket"', () => {
      const client = createSubscriptionClient()
      const handle = client.subscribe('subscription { test }', {})

      expect(handle.transport).toBe('websocket')
    })
  })

  describe('subscribe (SSE)', () => {
    it('should create SSE subscription when transport="sse"', () => {
      const client = createSubscriptionClient()
      const onData = vi.fn()

      client.subscribe('subscription { test }', {}, onData, undefined, { transport: 'sse' })

      expect(mockSseSubscribe).toHaveBeenCalledTimes(1)
      expect(mockWsSubscribe).not.toHaveBeenCalled()
    })

    it('should report transport as "sse"', () => {
      const client = createSubscriptionClient()
      const handle = client.subscribe('subscription { test }', {}, undefined, undefined, { transport: 'sse' })

      expect(handle.transport).toBe('sse')
    })

    it('should call onData with extracted payload for SSE', () => {
      let capturedSink: { next: (result: unknown) => void } | null = null
      mockSseSubscribe.mockImplementation((_payload, sink) => {
        capturedSink = sink
        return vi.fn()
      })

      const client = createSubscriptionClient()
      const onData = vi.fn()

      client.subscribe('subscription { sseField }', {}, onData, undefined, { transport: 'sse' })

      // Simulate receiving data
      capturedSink?.next({
        data: { sseField: { value: 'sse-data' } },
      })

      expect(onData).toHaveBeenCalledWith({ value: 'sse-data' })
    })
  })

  describe('subscribe (Auto)', () => {
    it('should try WebSocket first with auto transport', () => {
      const client = createSubscriptionClient()

      client.subscribe('subscription { test }', {}, undefined, undefined, { transport: 'auto' })

      expect(mockWsSubscribe).toHaveBeenCalledTimes(1)
    })

    it('should report initial transport as "websocket" for auto', () => {
      const client = createSubscriptionClient()
      const handle = client.subscribe('subscription { test }', {}, undefined, undefined, { transport: 'auto' })

      // Initially should report websocket
      expect(handle.transport).toBe('websocket')
    })
  })

  describe('createSession', () => {
    it('should create multiplexed session', () => {
      const client = createSubscriptionClient()
      const session = client.createSession()

      expect(session).toBeDefined()
      expect(session.subscribe).toBeDefined()
      expect(session.close).toBeDefined()
    })

    it('should track subscription count', () => {
      mockWsSubscribe.mockReturnValue(vi.fn())

      const client = createSubscriptionClient()
      const session = client.createSession()

      expect(session.subscriptionCount).toBe(0)

      session.subscribe('subscription { test1 }', {})
      expect(session.subscriptionCount).toBe(1)

      session.subscribe('subscription { test2 }', {})
      expect(session.subscriptionCount).toBe(2)
    })

    it('should notify state change listeners', () => {
      mockWsSubscribe.mockReturnValue(vi.fn())

      const client = createSubscriptionClient()
      const session = client.createSession()
      const listener = vi.fn()

      session.onStateChange(listener)
      session.subscribe('subscription { test }', {})

      expect(listener).toHaveBeenCalled()
    })

    it('should clean up all subscriptions on close()', () => {
      const mockUnsub1 = vi.fn()
      const mockUnsub2 = vi.fn()
      mockWsSubscribe
        .mockReturnValueOnce(mockUnsub1)
        .mockReturnValueOnce(mockUnsub2)

      const client = createSubscriptionClient()
      const session = client.createSession()

      session.subscribe('subscription { test1 }', {})
      session.subscribe('subscription { test2 }', {})

      session.close()

      expect(mockUnsub1).toHaveBeenCalled()
      expect(mockUnsub2).toHaveBeenCalled()
      expect(session.subscriptionCount).toBe(0)
    })

    it('should update count when subscription is manually unsubscribed', () => {
      mockWsSubscribe.mockReturnValue(vi.fn())

      const client = createSubscriptionClient()
      const session = client.createSession()

      const handle = session.subscribe('subscription { test }', {})
      expect(session.subscriptionCount).toBe(1)

      handle.unsubscribe()
      expect(session.subscriptionCount).toBe(0)
    })

    it('should report initial state as connected', () => {
      const client = createSubscriptionClient()
      const session = client.createSession()

      expect(session.state).toBe('connected')
      expect(session.isConnected).toBe(true)
    })

    it('should report state as disconnected after close', () => {
      const client = createSubscriptionClient()
      const session = client.createSession()

      session.close()

      expect(session.state).toBe('disconnected')
      expect(session.isConnected).toBe(false)
    })

    it('should allow removing state change listener', () => {
      mockWsSubscribe.mockReturnValue(vi.fn())

      const client = createSubscriptionClient()
      const session = client.createSession()
      const listener = vi.fn()

      const unsubscribe = session.onStateChange(listener)
      unsubscribe()

      session.subscribe('subscription { test }', {})

      // Listener should not be called after removal
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('dispose', () => {
    it('should dispose both WS and SSE clients', () => {
      const client = createSubscriptionClient()
      client.dispose()

      expect(mockWsDispose).toHaveBeenCalled()
      expect(mockSseDispose).toHaveBeenCalled()
    })
  })
})

describe('utility functions (internal)', () => {
  // These test the behavior through the public API
  // since the utility functions are not exported

  describe('uRL conversion', () => {
    it('should handle relative WebSocket paths', () => {
      // The client should convert /api/graphql/ws to ws://localhost/api/graphql/ws
      // We verify by checking createWsClient was called with the right URL pattern
      createSubscriptionClient({ wsEndpoint: '/ws/endpoint' })

      expect(createWsClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/^wss?:\/\/.*\/ws\/endpoint$/),
        }),
      )
    })

    it('should handle http:// WebSocket conversion', () => {
      createSubscriptionClient({ wsEndpoint: 'http://example.com/ws' })

      expect(createWsClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'ws://example.com/ws',
        }),
      )
    })

    it('should handle https:// WebSocket conversion', () => {
      createSubscriptionClient({ wsEndpoint: 'https://example.com/ws' })

      expect(createWsClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'wss://example.com/ws',
        }),
      )
    })

    it('should handle relative SSE paths', () => {
      createSubscriptionClient({ sseEndpoint: '/sse/endpoint' })

      expect(createSseClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/^https?:\/\/.*\/sse\/endpoint$/),
        }),
      )
    })
  })

  describe('data extraction', () => {
    it('should extract first value from data object', () => {
      let capturedSink: { next: (result: unknown) => void } | null = null
      mockWsSubscribe.mockImplementation((_payload, sink) => {
        capturedSink = sink
        return vi.fn()
      })

      const client = createSubscriptionClient()
      const onData = vi.fn()

      client.subscribe('subscription { mySubscription }', {}, onData)

      // Data with nested structure
      capturedSink?.next({
        data: {
          mySubscription: { nested: 'value', count: 42 },
        },
      })

      // Should extract the first (and only) field value
      expect(onData).toHaveBeenCalledWith({ nested: 'value', count: 42 })
    })

    it('should handle undefined data gracefully', () => {
      let capturedSink: { next: (result: unknown) => void } | null = null
      mockWsSubscribe.mockImplementation((_payload, sink) => {
        capturedSink = sink
        return vi.fn()
      })

      const client = createSubscriptionClient()
      const onData = vi.fn()

      client.subscribe('subscription { test }', {}, onData)

      // Data is undefined
      capturedSink?.next({ data: undefined })

      // onData should not be called for undefined data
      expect(onData).not.toHaveBeenCalled()
    })
  })
})
