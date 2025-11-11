import { EventEmitter } from 'node:events'

// Simple in-memory PubSub implementation
class PubSub {
  private emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
  }

  publish(trigger: string, payload: any) {
    this.emitter.emit(trigger, payload)
  }

  subscribe(trigger: string): AsyncIterable<any> {
    const emitter = this.emitter
    const listeners: Array<(value: any) => void> = []
    let listening = true

    const pullQueue: Array<(result: IteratorResult<any>) => void> = []
    const pushQueue: any[] = []

    const pushValue = (value: any) => {
      if (pullQueue.length) {
        pullQueue.shift()!({ value, done: false })
      }
      else {
        pushQueue.push(value)
      }
    }

    const pullValue = (): Promise<IteratorResult<any>> => {
      return new Promise((resolve) => {
        if (pushQueue.length) {
          resolve({ value: pushQueue.shift()!, done: false })
        }
        else {
          pullQueue.push(resolve)
        }
      })
    }

    const handler = (data: any) => pushValue(data)
    emitter.on(trigger, handler)
    listeners.push(handler)

    return {
      next: () => pullValue(),
      return: async () => {
        if (listening) {
          listening = false
          for (const listener of listeners) {
            emitter.off(trigger, listener)
          }
        }
        return { value: undefined, done: true }
      },
      throw: async (error: any) => {
        if (listening) {
          listening = false
          for (const listener of listeners) {
            emitter.off(trigger, listener)
          }
        }
        return Promise.reject(error)
      },
      [Symbol.asyncIterator]() {
        return this
      },
    }
  }
}

export const pubsub = new PubSub()
