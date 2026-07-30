import type { Access, FieldAccess } from 'payload'

type WithRoles = { roles?: string[]; id?: number | string } | null | undefined

const hasRole = (user: unknown, role: string): boolean =>
  Boolean((user as WithRoles)?.roles?.includes(role))

export const hasEditorRole = (user: unknown): boolean =>
  hasRole(user, 'admin') || hasRole(user, 'editor')

/** Public read - anyone, logged in or not. */
export const anyone: Access = () => true

/** Only admins. */
export const isAdmin: Access = ({ req: { user } }) => hasRole(user, 'admin')

/** Field-level admin guard. */
export const isAdminField: FieldAccess = ({ req: { user } }) => hasRole(user, 'admin')

/** Admins and editors - the editorial circle. */
export const isEditor: Access = ({ req: { user } }) => hasEditorRole(user)

/** Field-level editor guard. */
export const isEditorField: FieldAccess = ({ req: { user } }) => hasEditorRole(user)

/** Any authenticated user (admin, editor or member). */
export const isMember: Access = ({ req: { user } }) => Boolean(user)

/** The user's own document (by id), or an admin. */
export const isSelfOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (hasRole(user, 'admin')) return true
  return { id: { equals: user.id } }
}

/** Query constraint: docs whose `field` points at the current user. */
export const ownsDoc =
  (field: string): Access =>
  ({ req: { user } }) => {
    if (!user) return false
    return { [field]: { equals: user.id } }
  }

/** Draft-aware read: the public sees published docs only; editors see everything. */
export const publishedOrEditor: Access = ({ req: { user } }) => {
  if (hasEditorRole(user)) return true
  return { _status: { equals: 'published' } }
}
