import type { IMail } from '@vex-chat/types'
import type { VexClient } from '../client.ts'

type MailHandler = (mail: IMail, client: VexClient) => Promise<void> | void

/**
 * CommandRouter routes incoming mail messages to handlers based on message prefix.
 *
 * @example
 * const router = new CommandRouter(client)
 * router.on('!ping', async (mail) => client.replyTo(mail, 'pong'))
 * router.listen()
 */
export class CommandRouter {
  private readonly handlers = new Map<string, MailHandler>()

  constructor(private readonly client: VexClient) {}

  /**
   * Registers a handler for mail messages that start with the given prefix.
   * The prefix is matched against `mail.cipher` (the plaintext content after decryption).
   */
  on(prefix: string, handler: MailHandler): this {
    this.handlers.set(prefix, handler)
    return this
  }

  /**
   * Starts listening for incoming mail and dispatching to registered handlers.
   * Returns a cleanup function that stops listening.
   */
  listen(): () => void {
    let active = true

    void (async () => {
      for await (const mail of this.client.mail()) {
        if (!active) break
        for (const [prefix, handler] of this.handlers) {
          if (mail.cipher.startsWith(prefix)) {
            void Promise.resolve(handler(mail, this.client)).catch((err: unknown) => {
              this.client.emit('error', err instanceof Error ? err : new Error(String(err)))
            })
            break
          }
        }
      }
    })()

    return () => { active = false }
  }
}
