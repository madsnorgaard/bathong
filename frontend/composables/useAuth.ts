import type { Person, User } from '~/types/payload-types'

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

/** A sign-in refused only because the email is not confirmed yet. */
export class UnverifiedEmailError extends Error {
  readonly unverified = true
}
export const isUnverifiedError = (error: unknown): boolean =>
  error instanceof UnverifiedEmailError

export interface JoinOrder {
  reference: string
  amount: number
  joiningFee: number
  plan: 'monthly' | 'annual'
  status: string
}

export interface SessionInfo {
  id: string
  createdAt: string
  expiresAt: string
}
export interface SessionList {
  current: string | null
  sessions: SessionInfo[]
}

export interface SignUpInput {
  name: string
  email: string
  password: string
  newsletter: boolean
  /** honeypot; humans never fill it */
  website?: string
}

export function useAuth() {
  const user = useState<User | null>('auth-user', () => null)
  const { cms } = useCms()

  // Captured while the composable is created (inside setup/middleware, where
  // the request context is guaranteed), not inside a later handler where the
  // Nuxt instance may be gone after an await.
  //
  // Payload's extractJWT only reads the cookie when the request carries an
  // Origin on its csrf allowlist (or, with no Origin, a same-site
  // Sec-Fetch-Site). A server-side $fetch sends neither, so the cookie
  // alone is silently dropped and /me answers anonymous. The visitor's real
  // origin (localhost:3000 in CI, bathong.africa / next. in production) is
  // on CORS_ORIGINS in every environment. Browsers set Origin themselves.
  const cookie = import.meta.server ? useRequestHeaders(['cookie']).cookie : undefined
  const origin = import.meta.server ? useRequestURL().origin : undefined
  const withCookie = () =>
    cookie ? { headers: { cookie, ...(origin ? { origin } : {}) } } : {}

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
      if (/verify your email/i.test(raw)) {
        throw new UnverifiedEmailError(
          'Confirm your email first. Check your inbox, or ask for a new link.',
          { cause: error },
        )
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

  /** Make an account. Answers the same whether or not the address is known. */
  async function signUp(input: SignUpInput): Promise<void> {
    try {
      await cms('/api/account/sign-up', { method: 'POST', body: input })
    } catch (error) {
      throw new Error(messageOf(error, 'Could not make the account. Check your connection and try again.'), {
        cause: error,
      })
    }
  }

  async function verifyEmail(token: string): Promise<void> {
    try {
      await cms(`/api/users/verify/${encodeURIComponent(token)}`, { method: 'POST' })
    } catch (error) {
      throw new Error('That link is invalid or already used.', { cause: error })
    }
  }

  /** Same answer whatever the address: never says who has an account. */
  async function resendVerification(email: string): Promise<void> {
    try {
      await cms('/api/account/resend-verification', { method: 'POST', body: { email } })
    } catch (error) {
      throw new Error(messageOf(error, 'The request did not go through. Try again.'), { cause: error })
    }
  }

  /** Pick a plan: an order with an EFT reference comes back (or the open one). */
  async function join(plan: 'monthly' | 'annual'): Promise<JoinOrder> {
    try {
      return await authed<JoinOrder>('/api/account/join', { method: 'POST', body: { plan } })
    } catch (error) {
      throw new Error(messageOf(error, 'Could not start the order. Try again, or write to us.'), { cause: error })
    }
  }

  /** Edit the member's own profile (the API enforces which fields are theirs). */
  async function updateProfile(personId: number, patch: Record<string, unknown>): Promise<Person> {
    try {
      const res = await authed<{ doc: Person }>(`/api/people/${personId}?depth=1`, { method: 'PATCH', body: patch })
      return res.doc
    } catch (error) {
      throw new Error(messageOf(error, 'Could not save. Check your connection and try again.'), { cause: error })
    }
  }

  /**
   * Upload a portrait as a public media file; resolves to the media id.
   * XHR rather than fetch for real upload progress. Browser only.
   */
  function uploadPortrait(file: File, alt: string, onProgress?: (pct: number) => void): Promise<number> {
    const { cmsUrl } = useRuntimeConfig().public as { cmsUrl: string }
    return new Promise((resolve, reject) => {
      const form = new FormData()
      form.set('file', file)
      form.set('_payload', JSON.stringify({ alt, visibility: 'public' }))
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${cmsUrl.replace(/\/$/, '')}/api/media`)
      xhr.withCredentials = true
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status === 201) {
          try {
            resolve(JSON.parse(xhr.responseText).doc.id as number)
            return
          } catch {
            /* fall through */
          }
        }
        let message = 'The upload did not go through. Try a JPEG or PNG under 10 MB.'
        try {
          message = JSON.parse(xhr.responseText)?.errors?.[0]?.message ?? message
        } catch {
          /* keep the fallback */
        }
        reject(new Error(message))
      }
      xhr.onerror = () => reject(new Error('The upload did not go through. Check your connection and try again.'))
      xhr.send(form)
    })
  }

  const account = async <T = { ok: true }>(path: string, body: Record<string, unknown>, fallback: string): Promise<T> => {
    try {
      return await authed<T>(path, { method: 'POST', body })
    } catch (error) {
      throw new Error(messageOf(error, fallback), { cause: error })
    }
  }

  /** New password, current one checked; every other device is signed out. */
  const changePassword = (current: string, password: string) =>
    account('/api/account/change-password', { current, password }, 'Could not change the password. Try again.')

  /** Ask to move the account to a new address; it takes effect when that address confirms. */
  const changeEmail = (password: string, email: string) =>
    account<{ pendingEmail: string }>('/api/account/change-email', { password, email }, 'Could not start the change. Try again.')

  /** The link from the new address lands here; signs out everywhere. */
  async function confirmEmailChange(token: string): Promise<void> {
    try {
      await cms('/api/account/confirm-email', { method: 'POST', body: { token } })
    } catch (error) {
      throw new Error(messageOf(error, 'That link is invalid or already used.'), { cause: error })
    } finally {
      user.value = null
    }
  }

  async function sessions(): Promise<SessionList> {
    return await authed<SessionList>('/api/account/sessions')
  }

  const revokeSession = (id: string) =>
    account('/api/account/sessions/revoke', { id }, 'Could not sign that device out. Try again.')

  async function signOutEverywhere(): Promise<void> {
    try {
      await cms('/api/users/logout?allSessions=true', { method: 'POST', credentials: 'include' })
    } finally {
      user.value = null
    }
  }

  /** Close the account; the session ends with it. */
  async function deleteAccount(password: string): Promise<void> {
    await account('/api/account/delete', { password }, 'Could not close the account. Write to us.')
    user.value = null
  }

  const isSignedIn = computed(() => Boolean(user.value))

  return {
    join,
    updateProfile,
    uploadPortrait,
    changePassword,
    changeEmail,
    confirmEmailChange,
    sessions,
    revokeSession,
    signOutEverywhere,
    deleteAccount,
    user,
    isSignedIn,
    authed,
    fetchMe,
    login,
    logout,
    forgotPassword,
    resetPassword,
    signUp,
    verifyEmail,
    resendVerification,
  }
}
