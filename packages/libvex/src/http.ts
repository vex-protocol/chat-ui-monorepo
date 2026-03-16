import { decode as decodeMsgpack } from '@msgpack/msgpack'
import { errorFromStatus } from './errors.ts'
import type { VexError } from './errors.ts'

export type HttpResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: VexError }

/**
 * Parses a response body, handling both JSON and msgpack (old spire).
 * Detects format from Content-Type header.
 */
async function parseBody<T>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('msgpack') || ct.includes('octet-stream')) {
    const buf = await res.arrayBuffer()
    return decodeMsgpack(new Uint8Array(buf)) as T
  }
  return (await res.json()) as T
}

export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private token?: string,
  ) {}

  setToken(token: string): void {
    this.token = token
  }

  clearToken(): void {
    this.token = undefined
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token) h['Authorization'] = `Bearer ${this.token}`
    return h
  }

  async get<T>(path: string): Promise<HttpResult<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: this.headers(),
        credentials: 'include',
      })
      if (!res.ok) return { ok: false, error: errorFromStatus(res.status, await res.text()) }
      return { ok: true, data: await parseBody<T>(res) }
    } catch (err) {
      return { ok: false, error: { code: 'NETWORK_ERROR', message: String(err) } }
    }
  }

  async post<T>(path: string, body?: unknown): Promise<HttpResult<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.headers(),
        credentials: 'include',
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })
      if (!res.ok) return { ok: false, error: errorFromStatus(res.status, await res.text()) }
      return { ok: true, data: await parseBody<T>(res) }
    } catch (err) {
      return { ok: false, error: { code: 'NETWORK_ERROR', message: String(err) } }
    }
  }

  async postRaw(path: string, body: Uint8Array, contentType: string, extraHeaders?: Record<string, string>): Promise<HttpResult<void>> {
    const h: Record<string, string> = { 'Content-Type': contentType, ...extraHeaders }
    if (this.token) h['Authorization'] = `Bearer ${this.token}`
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: h,
        credentials: 'include',
        body: body as BodyInit,
      })
      if (!res.ok) return { ok: false, error: errorFromStatus(res.status, await res.text()) }
      return { ok: true, data: undefined }
    } catch (err) {
      return { ok: false, error: { code: 'NETWORK_ERROR', message: String(err) } }
    }
  }

  async postRawJson<T>(path: string, body: Uint8Array, contentType: string, extraHeaders?: Record<string, string>): Promise<HttpResult<T>> {
    const h: Record<string, string> = { 'Content-Type': contentType, ...extraHeaders }
    if (this.token) h['Authorization'] = `Bearer ${this.token}`
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: h,
        credentials: 'include',
        body: body as BodyInit,
      })
      if (!res.ok) return { ok: false, error: errorFromStatus(res.status, await res.text()) }
      return { ok: true, data: (await res.json()) as T }
    } catch (err) {
      return { ok: false, error: { code: 'NETWORK_ERROR', message: String(err) } }
    }
  }

  async getRaw(path: string): Promise<HttpResult<{ data: Uint8Array; contentType: string; headers: Record<string, string> }>> {
    const h: Record<string, string> = {}
    if (this.token) h['Authorization'] = `Bearer ${this.token}`
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: h,
        credentials: 'include',
      })
      if (!res.ok) return { ok: false, error: errorFromStatus(res.status, await res.text()) }
      const buf = new Uint8Array(await res.arrayBuffer())
      const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((v, k) => { responseHeaders[k] = v })
      return { ok: true, data: { data: buf, contentType, headers: responseHeaders } }
    } catch (err) {
      return { ok: false, error: { code: 'NETWORK_ERROR', message: String(err) } }
    }
  }

  async patch<T>(path: string, body?: unknown): Promise<HttpResult<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'PATCH',
        headers: this.headers(),
        credentials: 'include',
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })
      if (!res.ok) return { ok: false, error: errorFromStatus(res.status, await res.text()) }
      return { ok: true, data: await parseBody<T>(res) }
    } catch (err) {
      return { ok: false, error: { code: 'NETWORK_ERROR', message: String(err) } }
    }
  }

  async delete<T>(path: string): Promise<HttpResult<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'DELETE',
        headers: this.headers(),
        credentials: 'include',
      })
      if (!res.ok) return { ok: false, error: errorFromStatus(res.status, await res.text()) }
      return { ok: true, data: await parseBody<T>(res) }
    } catch (err) {
      return { ok: false, error: { code: 'NETWORK_ERROR', message: String(err) } }
    }
  }
}
