import { describe, expect, it } from 'vitest'
import { createPubSub, mapAsyncIterator, withFilter } from '../../../src/core/pubsub'

// Helper to collect items from async iterable
async function collectAsync<T>(
  iterable: AsyncIterable<T>,
  count: number,
): Promise<T[]> {
  const results: T[] = []
  for await (const item of iterable) {
    results.push(item)
    if (results.length >= count)
      break
  }
  return results
}

// Helper to get next item with timeout
function nextWithTimeout<T>(
  iterator: AsyncIterator<T>,
  timeoutMs = 100,
): Promise<IteratorResult<T>> {
  return Promise.race([
    iterator.next(),
    new Promise<IteratorResult<T>>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs),
    ),
  ])
}

describe('createPubSub', () => {
  describe('publish', () => {
    it('should emit events to subscribers', async () => {
      interface Topics {
        test: { message: string }
      }
      const pubsub = createPubSub<Topics>()

      const subscription = pubsub.subscribe('test')
      const iterator = subscription[Symbol.asyncIterator]()

      // Publish after subscribing
      await pubsub.publish('test', { message: 'hello' })

      const result = await nextWithTimeout(iterator)
      expect(result.done).toBe(false)
      expect(result.value).toEqual({ message: 'hello' })

      // Cleanup
      await iterator.return?.()
    })

    it('should support multiple topics', async () => {
      interface Topics {
        'topic-a': { a: number }
        'topic-b': { b: string }
      }
      const pubsub = createPubSub<Topics>()

      const subA = pubsub.subscribe('topic-a')
      const subB = pubsub.subscribe('topic-b')
      const iterA = subA[Symbol.asyncIterator]()
      const iterB = subB[Symbol.asyncIterator]()

      await pubsub.publish('topic-a', { a: 1 })
      await pubsub.publish('topic-b', { b: 'test' })

      const resultA = await nextWithTimeout(iterA)
      const resultB = await nextWithTimeout(iterB)

      expect(resultA.value).toEqual({ a: 1 })
      expect(resultB.value).toEqual({ b: 'test' })

      await iterA.return?.()
      await iterB.return?.()
    })

    it('should handle empty payload', async () => {
      interface Topics {
        empty: Record<string, never>
      }
      const pubsub = createPubSub<Topics>()

      const subscription = pubsub.subscribe('empty')
      const iterator = subscription[Symbol.asyncIterator]()

      await pubsub.publish('empty', {})

      const result = await nextWithTimeout(iterator)
      expect(result.value).toEqual({})

      await iterator.return?.()
    })
  })

  describe('subscribe', () => {
    it('should return AsyncIterable', () => {
      const pubsub = createPubSub()
      const subscription = pubsub.subscribe('test')

      expect(subscription[Symbol.asyncIterator]).toBeDefined()
      expect(typeof subscription[Symbol.asyncIterator]).toBe('function')
    })

    it('should receive published events', async () => {
      interface Topics {
        events: { id: number }
      }
      const pubsub = createPubSub<Topics>()

      const received: Array<{ id: number }> = []
      const subscription = pubsub.subscribe('events')

      // Start collecting in background
      const collectPromise = (async () => {
        for await (const event of subscription) {
          received.push(event)
          if (received.length >= 3)
            break
        }
      })()

      // Publish events
      await pubsub.publish('events', { id: 1 })
      await pubsub.publish('events', { id: 2 })
      await pubsub.publish('events', { id: 3 })

      await collectPromise

      expect(received).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    })

    it('should queue events when not awaiting', async () => {
      interface Topics {
        queue: { n: number }
      }
      const pubsub = createPubSub<Topics>()

      const subscription = pubsub.subscribe('queue')
      const iterator = subscription[Symbol.asyncIterator]()

      // Publish multiple events before awaiting
      await pubsub.publish('queue', { n: 1 })
      await pubsub.publish('queue', { n: 2 })
      await pubsub.publish('queue', { n: 3 })

      // Now consume them
      const r1 = await nextWithTimeout(iterator)
      const r2 = await nextWithTimeout(iterator)
      const r3 = await nextWithTimeout(iterator)

      expect(r1.value).toEqual({ n: 1 })
      expect(r2.value).toEqual({ n: 2 })
      expect(r3.value).toEqual({ n: 3 })

      await iterator.return?.()
    })

    it('should support multiple subscribers on same topic', async () => {
      interface Topics {
        shared: { data: string }
      }
      const pubsub = createPubSub<Topics>()

      const sub1 = pubsub.subscribe('shared')
      const sub2 = pubsub.subscribe('shared')
      const iter1 = sub1[Symbol.asyncIterator]()
      const iter2 = sub2[Symbol.asyncIterator]()

      await pubsub.publish('shared', { data: 'broadcast' })

      const r1 = await nextWithTimeout(iter1)
      const r2 = await nextWithTimeout(iter2)

      expect(r1.value).toEqual({ data: 'broadcast' })
      expect(r2.value).toEqual({ data: 'broadcast' })

      await iter1.return?.()
      await iter2.return?.()
    })

    it('should isolate subscribers between topics', async () => {
      interface Topics {
        'topic-x': { x: number }
        'topic-y': { y: number }
      }
      const pubsub = createPubSub<Topics>()

      const subX = pubsub.subscribe('topic-x')
      const subY = pubsub.subscribe('topic-y')
      const iterX = subX[Symbol.asyncIterator]()
      const iterY = subY[Symbol.asyncIterator]()

      // Publish only to topic-x
      await pubsub.publish('topic-x', { x: 100 })

      // topic-x should receive
      const resultX = await nextWithTimeout(iterX)
      expect(resultX.value).toEqual({ x: 100 })

      // topic-y should timeout (no event)
      await expect(nextWithTimeout(iterY, 50)).rejects.toThrow('Timeout')

      await iterX.return?.()
      await iterY.return?.()
    })
  })

  describe('cleanup', () => {
    it('should remove listener on iterator return()', async () => {
      interface Topics {
        cleanup: { id: number }
      }
      const pubsub = createPubSub<Topics>()

      const subscription = pubsub.subscribe('cleanup')
      const iterator = subscription[Symbol.asyncIterator]()

      // Call return to cleanup
      const result = await iterator.return?.()
      expect(result?.done).toBe(true)

      // After return, next() should return done
      const nextResult = await iterator.next()
      expect(nextResult.done).toBe(true)
    })

    it('should remove listener on iterator throw()', async () => {
      interface Topics {
        throw: { id: number }
      }
      const pubsub = createPubSub<Topics>()

      const subscription = pubsub.subscribe('throw')
      const iterator = subscription[Symbol.asyncIterator]()

      // Call throw to cleanup
      const error = new Error('Test error')
      await expect(iterator.throw?.(error)).rejects.toThrow('Test error')

      // After throw, next() should return done
      const nextResult = await iterator.next()
      expect(nextResult.done).toBe(true)
    })

    it('should not receive events after unsubscribe', async () => {
      interface Topics {
        unsub: { id: number }
      }
      const pubsub = createPubSub<Topics>()

      const subscription = pubsub.subscribe('unsub')
      const iterator = subscription[Symbol.asyncIterator]()

      // Receive first event
      await pubsub.publish('unsub', { id: 1 })
      const r1 = await nextWithTimeout(iterator)
      expect(r1.value).toEqual({ id: 1 })

      // Unsubscribe
      await iterator.return?.()

      // Publish more events
      await pubsub.publish('unsub', { id: 2 })
      await pubsub.publish('unsub', { id: 3 })

      // Should not receive them (done)
      const r2 = await iterator.next()
      expect(r2.done).toBe(true)
    })
  })
})

describe('withFilter', () => {
  it('should filter events based on predicate', async () => {
    interface Topics {
      numbers: number
    }
    const pubsub = createPubSub<Topics>()

    const subscription = pubsub.subscribe('numbers')
    const filtered = withFilter(subscription, n => n % 2 === 0) // Only even

    const collectPromise = collectAsync(filtered, 3)

    await pubsub.publish('numbers', 1)
    await pubsub.publish('numbers', 2)
    await pubsub.publish('numbers', 3)
    await pubsub.publish('numbers', 4)
    await pubsub.publish('numbers', 5)
    await pubsub.publish('numbers', 6)

    const results = await collectPromise
    expect(results).toEqual([2, 4, 6])
  })

  it('should support async predicates', async () => {
    interface Topics {
      async: { id: number }
    }
    const pubsub = createPubSub<Topics>()

    const subscription = pubsub.subscribe('async')
    const filtered = withFilter(subscription, async (item) => {
      await new Promise(r => setTimeout(r, 10))
      return item.id > 2
    })

    const collectPromise = collectAsync(filtered, 2)

    await pubsub.publish('async', { id: 1 })
    await pubsub.publish('async', { id: 2 })
    await pubsub.publish('async', { id: 3 })
    await pubsub.publish('async', { id: 4 })

    const results = await collectPromise
    expect(results).toEqual([{ id: 3 }, { id: 4 }])
  })

  it('should pass all events when predicate returns true', async () => {
    interface Topics {
      all: string
    }
    const pubsub = createPubSub<Topics>()

    const subscription = pubsub.subscribe('all')
    const filtered = withFilter(subscription, () => true)

    const collectPromise = collectAsync(filtered, 3)

    await pubsub.publish('all', 'a')
    await pubsub.publish('all', 'b')
    await pubsub.publish('all', 'c')

    const results = await collectPromise
    expect(results).toEqual(['a', 'b', 'c'])
  })

  it('should block all events when predicate returns false', async () => {
    interface Topics {
      none: string
    }
    const pubsub = createPubSub<Topics>()

    const subscription = pubsub.subscribe('none')
    const filtered = withFilter(subscription, () => false)
    const iterator = filtered[Symbol.asyncIterator]()

    await pubsub.publish('none', 'a')
    await pubsub.publish('none', 'b')

    // Should timeout since no events pass the filter
    await expect(nextWithTimeout(iterator, 50)).rejects.toThrow('Timeout')
  })
})

describe('mapAsyncIterator', () => {
  it('should transform events', async () => {
    interface Topics {
      map: { value: number }
    }
    const pubsub = createPubSub<Topics>()

    const subscription = pubsub.subscribe('map')
    const mapped = mapAsyncIterator(subscription, item => item.value * 2)

    const collectPromise = collectAsync(mapped, 3)

    await pubsub.publish('map', { value: 1 })
    await pubsub.publish('map', { value: 2 })
    await pubsub.publish('map', { value: 3 })

    const results = await collectPromise
    expect(results).toEqual([2, 4, 6])
  })

  it('should support async mappers', async () => {
    interface Topics {
      'async-map': { id: string }
    }
    const pubsub = createPubSub<Topics>()

    const subscription = pubsub.subscribe('async-map')
    const mapped = mapAsyncIterator(subscription, async (item) => {
      await new Promise(r => setTimeout(r, 10))
      return { transformed: item.id.toUpperCase() }
    })

    const collectPromise = collectAsync(mapped, 2)

    await pubsub.publish('async-map', { id: 'hello' })
    await pubsub.publish('async-map', { id: 'world' })

    const results = await collectPromise
    expect(results).toEqual([
      { transformed: 'HELLO' },
      { transformed: 'WORLD' },
    ])
  })
})
