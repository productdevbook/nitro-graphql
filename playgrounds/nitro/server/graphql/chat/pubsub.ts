// Simple in-memory PubSub implementation
type Subscriber<T> = (data: T) => void

class PubSub {
  private subscribers: Map<string, Set<Subscriber<any>>> = new Map()

  subscribe<T>(channel: string, callback: Subscriber<T>): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set())
    }
    this.subscribers.get(channel)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.subscribers.get(channel)?.delete(callback)
    }
  }

  publish<T>(channel: string, data: T): void {
    const subs = this.subscribers.get(channel)
    if (subs) {
      for (const callback of subs) {
        callback(data)
      }
    }
  }

  // Create an async iterator for subscriptions
  asyncIterator<T>(channel: string): AsyncIterableIterator<T> {
    const queue: T[] = []
    let resolve: ((value: IteratorResult<T>) => void) | null = null
    let done = false

    const unsubscribe = this.subscribe<T>(channel, (data) => {
      if (resolve) {
        resolve({ value: data, done: false })
        resolve = null
      }
      else {
        queue.push(data)
      }
    })

    return {
      [Symbol.asyncIterator]() {
        return this
      },
      async next(): Promise<IteratorResult<T>> {
        if (done) {
          return { value: undefined, done: true }
        }
        if (queue.length > 0) {
          return { value: queue.shift()!, done: false }
        }
        return new Promise((res) => {
          resolve = res
        })
      },
      async return(): Promise<IteratorResult<T>> {
        done = true
        unsubscribe()
        return { value: undefined, done: true }
      },
    }
  }
}

// Global singleton
export const pubsub = new PubSub()

// Channel names
export const CHANNELS = {
  MESSAGE: (channel: string) => `message:${channel}`,
  USER_EVENT: (channel: string) => `user_event:${channel}`,
}
