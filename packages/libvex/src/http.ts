import { errorFromStatus } from './errors.ts'
import type { VexError } from './errors.ts'

export type HttpResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: VexError }

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
      return { ok: true, data: (await res.json()) as T }
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
      return { ok: true, data: (await res.json()) as T }
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
      return { ok: true, data: (await res.json()) as T }
    } catch (err) {
      return { ok: false, error: { code: 'NETWORK_ERROR', message: String(err) } }
    }
  }
}
