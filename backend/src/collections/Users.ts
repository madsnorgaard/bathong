import type { CollectionConfig } from 'payload'
import { hasEditorRole, isAdmin, isAdminField } from '../access'

const siteUrl = () =>
  (process.env.SITE_URL || (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',')[0])
    .trim()
    .replace(/\/$/, '')

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // 10 minutes
    // Password resets land on the site, never on /admin: members do not have
    // panel access, so the stock admin reset link would only confuse them.
    // Editors can use the same page. SITE_URL falls back to the first CORS
    // origin (the site in every environment).
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
    // The email adapter (#15) is wired, so forgotPassword emails work today.
    // Members sign in from the site (#13) against these REST endpoints; the
    // frontend never links /admin. Accounts are still created by editors
    // (or the applications flow, #40), so there is no `verify` gate - add it
    // when self-signup opens.
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
    // First-user creation bypasses access automatically.
    create: isAdmin,
    // Members see themselves; editors and admins see everyone.
    read: ({ req: { user } }) => {
      if (!user) return false
      if (hasEditorRole(user)) return true
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if ((user.roles as string[] | undefined)?.includes('admin')) return true
      return { id: { equals: user.id } }
    },
    delete: isAdmin,
    // Admin panel is for the editorial circle only; members use the site.
    admin: ({ req: { user } }) => hasEditorRole(user),
  },
  fields: [
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
      access: { update: isAdminField },
    },
    {
      name: 'profile',
      type: 'relationship',
      relationTo: 'people',
      admin: { description: 'Link to a public People profile, if this user has one.' },
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
      access: { update: isAdminField },
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
      access: { update: isAdminField },
    },
    {
      name: 'membershipExpires',
      type: 'date',
      access: { update: isAdminField },
    },
  ],
}
