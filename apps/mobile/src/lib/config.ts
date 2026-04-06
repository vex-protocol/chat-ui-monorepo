import type { ServerOptions } from '@vex-chat/store'

// Server URL — hardcoded for now, will be configurable later
export function getServerUrl(): string {
  return 'http://localhost:16777'
}

export function getServerOptions(): ServerOptions {
  const host = getServerUrl()
  return { host, unsafeHttp: host.startsWith('http:') || host.startsWith('localhost') }
}
