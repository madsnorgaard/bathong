import type { User } from '~/types/payload-types'

/**
 * Member session against Payload's REST auth (issue #13). The cookie is the
 * session: set by /api/users/login on the api host (scoped to the parent
 * domain in production, see docs/PLATFORM.md), read back by /api/users/me.
 * Every call here sends credentials explicitly; public content fetches via
 * useCms never do.
 *
 * `user` is shared state: fetched once per request on the server (the
 * incoming cookie header is forwarded) and transferred to the client, so
 * the nav renders the right link before hydration.
 */
type PayloadError = { data?: { errors?: { message?: string }[] }; status?: number }

const messageOf = (error: unknown, fallback: string) =>
  (error as PayloadError)?.data?.errors?.[0]?.message ?? fallback

export function useAuth() {
  const user = useState<User | null>('auth-user', () => null)
  const { cms } = useCms()

  // Captured while the composable is created (inside setup/middleware, where
  // the request context is guaranteed), not inside a later handler where the
  // Nuxt instance may be gone after an await.
  const cookie = import.meta.server ? useRequestHeaders(['cookie']).cookie : undefined
  const withCookie = () => (cookie ? { headers: { cookie } } : {})

  /** An authenticated CMS call: credentials on, cookie forwarded during SSR. */
  const authed = <T = unknown>(path: string, opts: Record<string, unknown> = {}) =>
    cms<T>(path, { credentials: 'include', ...withCookie(), ...opts })

  async function fetchMe(): Promise<User | null> {
    try {
      const res = await authed<{ user: User | null }>('/api/users/me?depth=1')
      user.value = res?.user ?? null
    } catch {
      user.value = null
    }
    return user.value
  }

  async function login(email: string, password: string): Promise<User> {
    try {
      const res = await cms<{ user: User }>('/api/users/login?depth=1', {
        method: 'POST',
        credentials: 'include',
        body: { email, password },
      })
      user.value = res.user
      return res.user
    } catch (error) {
      const status = (error as PayloadError).status
      const raw = messageOf(error, '')
      if (/locked/i.test(raw)) {
        throw new Error('Too many attempts. This account is locked for ten minutes.', { cause: error })
      }
      if (status === 401) throw new Error('That email and password do not match.', { cause: error })
      throw new Error(raw || 'Could not sign in. Check your connection and try again.', {
        cause: error,
      })
    }
  }

  async function logout(): Promise<void> {
    try {
      await cms('/api/users/logout', { method: 'POST', credentials: 'include' })
    } finally {
      user.value = null
    }
  }

  async function forgotPassword(email: string): Promise<void> {
    // Payload answers 200 whether or not the address exists; so do we.
    await cms('/api/users/forgot-password', { method: 'POST', body: { email } })
  }

  async function resetPassword(token: string, password: string): Promise<User> {
    try {
      const res = await cms<{ user: User }>('/api/users/reset-password', {
        method: 'POST',
        credentials: 'include',
        body: { token, password },
      })
      user.value = res.user
      return res.user
    } catch (error) {
      throw new Error(
        messageOf(error, 'That link has expired or was already used. Ask for a new one.'),
        { cause: error },
      )
    }
  }

  const isSignedIn = computed(() => Boolean(user.value))

  return { user, isSignedIn, authed, fetchMe, login, logout, forgotPassword, resetPassword }
}
