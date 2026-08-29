import type { PayloadRequest } from 'payload'

/** The error shape the frontend already reads: errors[0].message. */
export const bad = (message: string, status = 400) =>
  Response.json({ errors: [{ message }] }, { status })

export const ok = (body: Record<string, unknown> = { ok: true }, status = 200) =>
  Response.json(body, { status })

/** The JSON body of a custom endpoint request, or null when it is not JSON. */
export async function readJson<T = Record<string, unknown>>(req: PayloadRequest): Promise<T | null> {
  try {
    const body = await (req as unknown as Request).json()
    return body && typeof body === 'object' ? (body as T) : null
  } catch {
    return null
  }
}

export const str = (v: unknown, max = 200): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const isEmail = (v: string): boolean => EMAIL.test(v) && v.length <= 254
