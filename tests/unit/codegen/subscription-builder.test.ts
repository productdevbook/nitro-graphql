/**
 * Tests for subscription builder code generation
 * Tests the generateSubscriptionBuilder function from src/core/codegen/client.ts
 */
import type { Source } from '@graphql-tools/utils'
import { parse } from 'graphql'
import { describe, expect, it } from 'vitest'
import { generateSubscriptionBuilder } from '../../../src/core/codegen/client'

// Helper to create a Source with parsed document from GraphQL document string
function createSource(documentStr: string, location = 'test.graphql'): Source {
  return {
    document: parse(documentStr),
    location,
    rawSDL: documentStr,
  }
}

describe('generateSubscriptionBuilder', () => {
  describe('basic behavior', () => {
    it('should return empty string when subscriptions disabled', () => {
      const docs = [createSource(`
        subscription OnMessage {
          messageAdded { id content }
        }
      `)]

      const result = generateSubscriptionBuilder(docs, false)

      expect(result).toBe('')
    })

    it('should return empty string when no subscription operations', () => {
      const docs = [createSource(`
        query GetMessages {
          messages { id content }
        }
        mutation SendMessage($content: String!) {
          sendMessage(content: $content) { id }
        }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toBe('')
    })

    it('should return empty string for empty docs array', () => {
      const result = generateSubscriptionBuilder([], true)

      expect(result).toBe('')
    })

    it('should generate code when subscriptions enabled and present', () => {
      const docs = [createSource(`
        subscription OnMessage {
          messageAdded { id content }
        }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).not.toBe('')
      expect(result.length).toBeGreaterThan(100)
    })
  })

  describe('imports generation', () => {
    it('should generate Vue imports', () => {
      const docs = [createSource(`
        subscription Test { test { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('import { ref, onUnmounted, computed } from \'vue\'')
      expect(result).toContain('import type { Ref } from \'vue\'')
    })

    it('should generate subscribe module imports', () => {
      const docs = [createSource(`
        subscription Test { test { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('from \'nitro-graphql/subscribe\'')
      expect(result).toContain('import { subscriptionClient } from \'./subscribe\'')
    })

    it('should export subscription types', () => {
      const docs = [createSource(`
        subscription Test { test { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('export type { ConnectionState, SubscriptionHandle, SubscriptionSession, SubscriptionTransport, TransportOptions }')
    })
  })

  describe('interface generation', () => {
    it('should generate UseSubscriptionOptions interface', () => {
      const docs = [createSource(`
        subscription Test { test { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('export interface UseSubscriptionOptions<T>')
      expect(result).toContain('immediate?: boolean')
      expect(result).toContain('onData?: (data: T) => void')
      expect(result).toContain('onError?: (error: Error) => void')
      expect(result).toContain('transport?: SubscriptionTransport')
    })

    it('should generate UseSubscriptionReturn interface', () => {
      const docs = [createSource(`
        subscription Test { test { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('export interface UseSubscriptionReturn<T>')
      expect(result).toContain('data: Ref<T | null>')
      expect(result).toContain('error: Ref<Error | null>')
      expect(result).toContain('isActive: Ref<boolean>')
      expect(result).toContain('start: () => void')
      expect(result).toContain('stop: () => void')
      expect(result).toContain('restart: () => void')
    })

    it('should generate SubscriptionBuilder interface', () => {
      const docs = [createSource(`
        subscription Test { test { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('interface SubscriptionBuilder<TData>')
      expect(result).toContain('onData(fn: (data: TData) => void): SubscriptionBuilder<TData>')
      expect(result).toContain('onError(fn: (error: Error) => void): SubscriptionBuilder<TData>')
      expect(result).toContain('start(): SubscriptionHandle')
    })
  })

  describe('vue composables generation', () => {
    it('should generate useXxx for subscription without variables', () => {
      const docs = [createSource(`
        subscription AllMessages {
          allMessages { id content }
        }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('export function useAllMessages(')
      expect(result).toContain('UseAllMessagesReturn')
    })

    it('should generate useXxx for subscription with variables', () => {
      const docs = [createSource(`
        subscription MessageAdded($channelId: ID!) {
          messageAdded(channelId: $channelId) { id content }
        }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('export function useMessageAdded(')
      expect(result).toContain('variables: Types.MessageAddedSubscriptionVariables')
    })

    it('should generate return type alias for each subscription', () => {
      const docs = [createSource(`
        subscription Countdown {
          countdown { value }
        }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('export type UseCountdownReturn = UseSubscriptionReturn<')
    })

    it('should handle multiple subscriptions', () => {
      const docs = [createSource(`
        subscription OnMessage {
          messageAdded { id }
        }
        subscription OnUser {
          userJoined { id name }
        }
        subscription OnTyping {
          typing { userId }
        }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('useOnMessage')
      expect(result).toContain('useOnUser')
      expect(result).toContain('useOnTyping')
    })
  })

  describe('drizzle-style API generation', () => {
    it('should generate subscription object', () => {
      const docs = [createSource(`
        subscription Test { test { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('export const subscription = {')
    })

    it('should generate subscription.Xxx builders without variables', () => {
      const docs = [createSource(`
        subscription AllMessages {
          allMessages { id }
        }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('AllMessages(): SubscriptionBuilder<')
      expect(result).toContain('AllMessagesDocument, undefined')
    })

    it('should generate subscription.Xxx builders with variables', () => {
      const docs = [createSource(`
        subscription MessageAdded($channelId: ID!) {
          messageAdded(channelId: $channelId) { id }
        }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('MessageAdded(variables: Types.MessageAddedSubscriptionVariables)')
      expect(result).toContain('MessageAddedDocument, variables')
    })

    it('should generate createSubscriptionBuilder helper', () => {
      const docs = [createSource(`
        subscription Test { test { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('function createSubscriptionBuilder<TData>(query: string, variables: unknown)')
      expect(result).toContain('subscriptionClient.subscribe(query, variables, onDataFn, onErrorFn)')
    })
  })

  describe('session composable generation', () => {
    it('should generate useSubscriptionSession', () => {
      const docs = [createSource(`
        subscription Test { test { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('export function useSubscriptionSession(): UseSubscriptionSessionReturn')
      expect(result).toContain('subscriptionClient.createSession()')
    })

    it('should generate createSubscriptionSession for framework-agnostic usage', () => {
      const docs = [createSource(`
        subscription Test { test { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('export function createSubscriptionSession(): SubscriptionSession')
    })

    it('should generate UseSubscriptionSessionReturn interface', () => {
      const docs = [createSource(`
        subscription Test { test { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('export interface UseSubscriptionSessionReturn')
      expect(result).toContain('session: SubscriptionSession')
      expect(result).toContain('isConnected: Ref<boolean>')
      expect(result).toContain('state: Ref<ConnectionState>')
      expect(result).toContain('subscriptionCount: Ref<number>')
    })
  })

  describe('type safety', () => {
    it('should reference correct subscription types from Types module', () => {
      const docs = [createSource(`
        subscription MySubscription {
          myField { id data }
        }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('Types.MySubscriptionSubscription[\'myField\']')
      expect(result).toContain('MySubscriptionDocument')
    })

    it('should reference correct variable types when present', () => {
      const docs = [createSource(`
        subscription WatchItem($itemId: ID!, $deep: Boolean) {
          watchItem(id: $itemId, deep: $deep) { id status }
        }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('Types.WatchItemSubscriptionVariables')
    })
  })

  describe('edge cases', () => {
    it('should handle subscription with fragment', () => {
      const docs = [createSource(`
        subscription OnMessage {
          messageAdded {
            ...MessageFields
          }
        }
        fragment MessageFields on Message {
          id
          content
          createdAt
        }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('useOnMessage')
      expect(result).toContain('OnMessageDocument')
    })

    it('should handle mixed operations (query, mutation, subscription)', () => {
      const docs = [createSource(`
        query GetMessages {
          messages { id }
        }
        mutation SendMessage($content: String!) {
          sendMessage(content: $content) { id }
        }
        subscription OnMessage {
          messageAdded { id }
        }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      // Should only generate for subscriptions, not queries/mutations
      expect(result).toContain('useOnMessage')
      expect(result).not.toContain('useGetMessages')
      expect(result).not.toContain('useSendMessage')
    })

    it('should handle multiple documents from different files', () => {
      const docs = [
        createSource(`
          subscription Sub1 { field1 { id } }
        `, 'file1.graphql'),
        createSource(`
          subscription Sub2 { field2 { id } }
        `, 'file2.graphql'),
      ]

      const result = generateSubscriptionBuilder(docs, true)

      expect(result).toContain('useSub1')
      expect(result).toContain('useSub2')
    })
  })

  describe('no duplicate UseSubscriptionSessionReturn', () => {
    it('should contain exactly one UseSubscriptionSessionReturn interface declaration', () => {
      const docs = [createSource(`
        subscription OnMessage {
          messageAdded { id content }
        }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      // Count occurrences of the interface declaration
      const interfaceMatches = result.match(/export interface UseSubscriptionSessionReturn/g)
      expect(interfaceMatches).not.toBeNull()
      expect(interfaceMatches).toHaveLength(1)
    })

    it('should not duplicate UseSubscriptionSessionReturn with multiple subscriptions', () => {
      const docs = [createSource(`
        subscription Sub1 { field1 { id } }
        subscription Sub2 { field2 { id } }
        subscription Sub3 { field3 { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      const interfaceMatches = result.match(/export interface UseSubscriptionSessionReturn/g)
      expect(interfaceMatches).toHaveLength(1)
    })

    it('should not duplicate UseSubscriptionSessionReturn with multiple document sources', () => {
      const docs = [
        createSource(`
          subscription Alpha { alpha { id } }
        `, 'alpha.graphql'),
        createSource(`
          subscription Beta { beta { id } }
        `, 'beta.graphql'),
        createSource(`
          subscription Gamma { gamma { id } }
        `, 'gamma.graphql'),
      ]

      const result = generateSubscriptionBuilder(docs, true)

      const interfaceMatches = result.match(/export interface UseSubscriptionSessionReturn/g)
      expect(interfaceMatches).toHaveLength(1)
    })

    it('should contain exactly one UseSubscriptionOptions interface declaration', () => {
      const docs = [createSource(`
        subscription Sub1 { field1 { id } }
        subscription Sub2 { field2 { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      const matches = result.match(/export interface UseSubscriptionOptions/g)
      expect(matches).toHaveLength(1)
    })

    it('should contain exactly one UseSubscriptionReturn interface declaration', () => {
      const docs = [createSource(`
        subscription Sub1 { field1 { id } }
        subscription Sub2 { field2 { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      const matches = result.match(/export interface UseSubscriptionReturn/g)
      expect(matches).toHaveLength(1)
    })

    it('should contain exactly one useSubscriptionSession function declaration', () => {
      const docs = [createSource(`
        subscription Sub1 { field1 { id } }
        subscription Sub2 { field2 { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      const matches = result.match(/export function useSubscriptionSession\(\)/g)
      expect(matches).toHaveLength(1)
    })

    it('should contain exactly one createSubscriptionSession function declaration', () => {
      const docs = [createSource(`
        subscription Sub1 { field1 { id } }
        subscription Sub2 { field2 { id } }
      `)]

      const result = generateSubscriptionBuilder(docs, true)

      const matches = result.match(/export function createSubscriptionSession\(\)/g)
      expect(matches).toHaveLength(1)
    })
  })
})
