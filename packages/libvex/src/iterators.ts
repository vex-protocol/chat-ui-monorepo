import type { EventEmitter } from 'eventemitter3'

/**
 * Converts a named EventEmitter event into an AsyncIterable.
 * Yields each emitted value. The iterator ends when the emitter emits 'close'.
 *
 * @example
 * for await (const mail of fromEvent(client, 'mail')) { ... }
 */
export function fromEvent<T>(
  emitter: EventEmitter,
  event: string,
): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<T> {
      const queue: T[] = []
      const resolvers: Array<(value: IteratorResult<T>) => void> = []
      let done = false

      function onEvent(value: T): void {
        if (resolvers.length > 0) {
          resolvers.shift()!({ value, done: false })
        } else {
          queue.push(value)
        }
      }

      function onClose(): void {
        done = true
        emitter.off(event, onEvent)
        for (const resolve of resolvers.splice(0)) {
          resolve({ value: undefined as unknown as T, done: true })
        }
      }

      emitter.on(event, onEvent)
      emitter.once('close', onClose)

      return {
        next(): Promise<IteratorResult<T>> {
          if (queue.length > 0) {
            return Promise.resolve({ value: queue.shift()!, done: false })
          }
          if (done) {
            return Promise.resolve({ value: undefined as unknown as T, done: true })
          }
          return new Promise((resolve) => resolvers.push(resolve))
        },
        return(): Promise<IteratorResult<T>> {
          onClose()
          return Promise.resolve({ value: undefined as unknown as T, done: true })
        },
      }
    },
  }
}
