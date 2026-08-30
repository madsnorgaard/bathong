import type { CollectionConfig } from 'payload'
import { APIError, ValidationError } from 'payload'
import { hasEditorRole, isAdmin, isAdminField } from '../access'
import { passwordProblem } from '../lib/password'
import { siteUrl } from '../lib/siteUrl'

const isAdminUser = (user: { roles?: unknown } | null | undefined) =>
  ((user?.roles as string[] | undefined) ?? []).includes('admin')

/** Only the account itself or an admin reads a pending-email address. */
const selfOrAdminRead = ({ req: { user }, doc }: { req: { user?: { id?: number | string; roles?: unknown } | null }; doc?: { id?: number | string } }) =>
  isAdminUser(user) || (Boolean(user?.id) && user?.id === doc?.id)

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // 10 minutes
    // Sign-up is open (#40): an account is free and must confirm its email
    // before it can sign in. The sign-up endpoint sends the plain-text
    // verify mail itself; this HTML one covers accounts an editor creates
    // in the admin. Both point at the site, never at /admin.
    verify: {
      generateEmailSubject: () => 'Confirm your Bathong. email',
      generateEmailHTML: ({ token }) => {
        const link = `${siteUrl()}/account/verify?token=${encodeURIComponent(token ?? '')}`
        return [
          '<p>Confirm this email to finish making your Bathong. account:</p>',
          `<p><a href="${link}">${link}</a></p>`,
          '<p>If you did not make an account, ignore this email and nothing happens.</p>',
          '<p>BATHONG.<br>https://bathong.africa</p>',
        ].join('')
      },
    },
    // Password resets land on the site, never on /admin: members do not have
    // panel access, so the stock admin reset link would only confuse them.
    // Editors can use the same page.
    forgotPassword: {
      generateEmailSubject: () => 'Reset your Bathong. password',
      generateEmailHTML: (args) => {
        const token = args?.token ?? ''
        const link = `${siteUrl()}/account/reset?token=${encodeURIComponent(token)}`
        return [
          '<p>Someone asked to reset the password on this Bathong. account. If it was you, use this link within the hour:</p>',
          `<p><a href="${link}">${link}</a></p>`,
          '<p>If it was not you, ignore this email and nothing changes.</p>',
          '<p>BATHONG.<br>https://bathong.africa</p>',
        ].join('')
      },
    },
    // Cross-subdomain cookies: the frontend and API live on sibling subdomains,
    // so in production the cookie must be scoped to the parent domain and sent
    // cross-site. Leave COOKIE_DOMAIN unset in dev (plain http, same origin).
    ...(process.env.COOKIE_DOMAIN
      ? {
          cookies: {
            domain: process.env.COOKIE_DOMAIN,
            sameSite: 'None' as const,
            secure: true,
          },
        }
      : {}),
  },
  admin: { useAsTitle: 'name', group: 'System' },
  access: {
    // Accounts come through /api/account/sign-up; the admin creates editors.
    create: isAdmin,
    // Members see themselves; editors and admins see everyone.
    read: ({ req: { user } }) => {
      if (!user) return false
      if (hasEditorRole(user)) return true
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (isAdminUser(user)) return true
      return { id: { equals: user.id } }
    },
    delete: isAdmin,
    // Payload's default lets any signed-in user unlock any account by email.
    unlock: isAdmin,
    // Admin panel is for the editorial circle only; members use the site.
    admin: ({ req: { user } }) => hasEditorRole(user),
  },
  fields: [
    // Base auth fields redeclared to harden them (Payload merges over its
    // own definition, keeping type, uniqueness and validation).
    // Email changes go through /api/account/change-email with re-verification.
    { name: 'email', type: 'email', access: { update: isAdminField } },
    // Without this, any signed-in account could verify itself with a PATCH.
    { name: '_verified', type: 'checkbox', access: { create: isAdminField, update: isAdminField } },
    { name: 'name', type: 'text', required: true },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['member'],
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Member', value: 'member' },
      ],
      access: { create: isAdminField, update: isAdminField },
    },
    {
      name: 'profile',
      type: 'relationship',
      relationTo: 'people',
      access: { update: isAdminField },
      admin: { description: 'The public People profile this account edits. Set on activation.' },
    },
    {
      // One membership, no tiers: the plan is how it is paid.
      name: 'membershipPlan',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Annual', value: 'annual' },
      ],
      access: { create: isAdminField, update: isAdminField },
    },
    {
      name: 'membershipStatus',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Active', value: 'active' },
        { label: 'Lapsed', value: 'lapsed' },
      ],
      access: { create: isAdminField, update: isAdminField },
    },
    {
      name: 'membershipExpires',
      type: 'date',
      access: { create: isAdminField, update: isAdminField },
    },
    {
      name: 'memberSince',
      type: 'date',
      access: { create: isAdminField, update: isAdminField },
      admin: {
        description:
          'First activation. Set once; the joining fee is charged only while this is empty.',
      },
    },
    {
      name: 'newsletter',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Opted in to occasional email from the collective. A preference only; no tool is connected yet.',
      },
    },
    {
      // An email change waits here until the new address confirms it.
      name: 'pendingEmail',
      type: 'email',
      access: { read: selfOrAdminRead, create: () => false, update: () => false },
      admin: { readOnly: true },
    },
    {
      name: 'pendingEmailToken',
      type: 'text',
      hidden: true,
      access: { create: () => false, update: () => false },
    },
    {
      name: 'pendingEmailExpires',
      type: 'date',
      access: { read: selfOrAdminRead, create: () => false, update: () => false },
      admin: { hidden: true },
    },
  ],
  hooks: {
    beforeOperation: [
      // reset-password never reaches beforeValidate with the plaintext (it
      // hashes first), so the rule is applied to the operation's arguments.
      ({ args, operation }) => {
        if (operation === 'resetPassword') {
          const password = (args as { data?: { password?: unknown } }).data?.password
          if (typeof password === 'string') {
            const problem = passwordProblem(password)
            if (problem) {
              throw new ValidationError({
                collection: 'users',
                errors: [{ path: 'password', message: problem }],
              })
            }
          }
        }
        return args
      },
    ],
    afterOperation: [
      // A password reset kills a pending email change too: the person
      // resetting may be the one that change was meant to lock out.
      // resetPassword writes the hash straight through the db adapter, so
      // no beforeChange hook sees it; this is the one hook that runs.
      async ({ operation, result, req }) => {
        if (operation !== 'resetPassword') return result
        const id = (result as { user?: { id?: number } } | undefined)?.user?.id
        if (id) {
          await req.payload.update({
            collection: 'users',
            id,
            data: { pendingEmail: null, pendingEmailToken: null, pendingEmailExpires: null },
            overrideAccess: true,
            req,
          })
        }
        return result
      },
    ],
    beforeValidate: [
      ({ data, operation, originalDoc, req }) => {
        if (typeof data?.password !== 'string') return data
        // A member changes their password from the security page, which
        // checks the current one and signs other devices out. The stock
        // PATCH checks nothing, so it is admin-only.
        if (operation === 'update' && !req.context?.passwordChange && !isAdminUser(req.user)) {
          throw new APIError('Change your password from the security page.', 403)
        }
        const problem = passwordProblem(data.password, data.email ?? originalDoc?.email)
        if (problem) {
          throw new ValidationError({
            collection: 'users',
            errors: [{ path: 'password', message: problem }],
          })
        }
        return data
      },
    ],
    afterChange: [
      // An admin pointing an account at a profile makes the account its owner.
      async ({ doc, previousDoc, operation, req, context }) => {
        if (operation !== 'update' || context?.syncingOwner) return
        const rel = (v: unknown) =>
          typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v ? (v as { id: number }).id : null
        const now = rel(doc.profile)
        const before = rel(previousDoc?.profile)
        if (now === before) return
        const sync = { overrideAccess: true as const, req, context: { syncingOwner: true } }
        if (before) {
          await req.payload.update({ collection: 'people', id: before, data: { owner: null }, ...sync })
        }
        if (now) {
          await req.payload.update({ collection: 'people', id: now, data: { owner: doc.id }, ...sync })
        }
      },
    ],
    afterRead: [
      // A membership past its date reads as lapsed without a write; a job
      // that writes it and emails the member comes later.
      ({ doc }) => {
        if (
          doc?.membershipStatus === 'active' &&
          doc.membershipExpires &&
          new Date(doc.membershipExpires).getTime() < Date.now()
        ) {
          doc.membershipStatus = 'lapsed'
        }
        return doc
      },
    ],
  },
}
