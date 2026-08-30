import type { Access, CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { hasEditorRole, isAdmin, isAdminField, isEditor } from '../access'
import { activationBase, nextExpiry, type Plan } from '../lib/membership'
import { siteUrl } from '../lib/siteUrl'
import { slugify } from '../fields/slug'
import { sendSafe } from '../email/send'
import { membershipActivated } from '../email/templates'

/** Members see their own orders; editors and admins see everything. */
const canReadOrder: Access = ({ req: { user } }) => {
  if (!user) return false
  if (hasEditorRole(user)) return true
  return { user: { equals: user.id } }
}

const rel = (v: unknown): number | null =>
  typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v ? (v as { id: number }).id : null

/** The next member number, from a Postgres sequence: atomic, never reused. */
async function nextMemberNumber(payload: { db: { drizzle: { execute: (q: unknown) => Promise<unknown> } } }): Promise<number> {
  const res = (await payload.db.drizzle.execute(sql`SELECT nextval('people_member_number_seq') AS n`)) as {
    rows?: { n: string | number }[]
  }
  const n = Number(res.rows?.[0]?.n)
  if (!Number.isFinite(n)) throw new APIError('Could not assign a member number.', 500)
  return n
}

/**
 * Orders are the money side of membership. The site creates them through
 * the join endpoint (local API); an editor marks one paid in the admin when
 * the EFT shows, and the hooks below do the rest: the covered period, the
 * member's plan and expiry, a People profile with a member number, and the
 * welcome mail. A payment provider later (PayFast, #18) flips the same
 * status by webhook, keyed on `reference`; nothing here changes.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'user', 'plan', 'amount', 'status', 'createdAt'],
    group: 'System',
    hidden: ({ user }) => !hasEditorRole(user),
  },
  access: {
    create: () => false,
    read: canReadOrder,
    update: isEditor,
    delete: isAdmin,
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', index: true, access: { update: isAdminField } },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Membership', value: 'membership' },
        { label: 'Walk', value: 'walk' },
      ],
      access: { update: isAdminField },
    },
    {
      name: 'plan',
      type: 'select',
      options: [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Annual', value: 'annual' },
      ],
      access: { update: isAdminField },
      admin: { condition: (data) => data?.type === 'membership' },
    },
    { name: 'item', type: 'relationship', relationTo: 'walks', access: { update: isAdminField } },
    {
      name: 'amount',
      type: 'number',
      access: { update: isAdminField },
      admin: { description: 'Total in rand, frozen at order time.' },
    },
    {
      name: 'joiningFee',
      type: 'number',
      defaultValue: 0,
      access: { update: isAdminField },
      admin: { description: 'The part of the amount that is the once-off joining fee.' },
    },
    { name: 'currency', type: 'text', defaultValue: 'ZAR', access: { update: isAdminField } },
    {
      name: 'reference',
      type: 'text',
      unique: true,
      index: true,
      access: { update: isAdminField },
      admin: { description: 'What the member types as the EFT reference.' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Refunded', value: 'refunded' },
      ],
      admin: { description: 'Set to Paid when the EFT shows. That activates the membership.' },
    },
    {
      name: 'paidAt',
      type: 'date',
      admin: { description: 'Left empty, it is set when the status becomes paid.' },
    },
    { name: 'coveredFrom', type: 'date', access: { update: isAdminField }, admin: { readOnly: true } },
    { name: 'coveredUntil', type: 'date', access: { update: isAdminField }, admin: { readOnly: true } },
    {
      name: 'provider',
      type: 'select',
      options: [
        { label: 'PayFast', value: 'payfast' },
        { label: 'Manual', value: 'manual' },
      ],
    },
    { name: 'providerRef', type: 'text' },
    { name: 'note', type: 'textarea', admin: { description: 'Who confirmed the EFT, and when.' } },
    {
      name: 'raw',
      type: 'json',
      access: { read: isAdminField, update: isAdminField },
      admin: { description: 'Raw provider payload for auditing.' },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        const type = data.type ?? originalDoc?.type
        if (type !== 'membership') return data
        const becomingPaid =
          data.status === 'paid' && (operation === 'create' || originalDoc?.status !== 'paid')
        if (!becomingPaid) return data

        const userId = rel(data.user ?? originalDoc?.user)
        const plan = (data.plan ?? originalDoc?.plan) as Plan | undefined
        if (!userId || !plan) throw new APIError('A membership order needs a member and a plan.', 400)

        const paidAt = data.paidAt ? new Date(data.paidAt) : new Date()
        const user = await req.payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true, req })
        const base = activationBase(user, paidAt)
        data.paidAt = paidAt.toISOString()
        data.coveredFrom = base.toISOString()
        data.coveredUntil = nextExpiry(base, plan).toISOString()
        return data
      },
    ],
    afterChange: [
      // Activation, read off the saved order rather than a flag left in the
      // hook context: every local API call made with `req` replaces
      // `req.context` with a fresh object, so a flag set in beforeChange
      // after such a call never reaches this hook. Nothing here writes back
      // to the order.
      async ({ doc, previousDoc, operation, req }) => {
        const becamePaid =
          doc.type === 'membership' &&
          doc.status === 'paid' &&
          (operation === 'create' || previousDoc?.status !== 'paid')
        const userId = rel(doc.user)
        const plan = doc.plan as Plan | undefined
        if (!becamePaid || !userId || !plan || !doc.coveredUntil || !doc.paidAt) return
        const act = { userId, plan, paidAt: doc.paidAt as string, until: doc.coveredUntil as string }
        const { payload } = req
        const sync = { syncingOwner: true }

        const user = await payload.findByID({ collection: 'users', id: act.userId, depth: 0, overrideAccess: true, req })

        // The profile: the one the account already points at, one an editor
        // linked by hand, or a new one made from the account name.
        let personId = rel(user.profile)
        if (!personId) {
          const owned = await payload.find({
            collection: 'people',
            where: { owner: { equals: user.id } },
            limit: 1,
            depth: 0,
            overrideAccess: true,
            req,
          })
          personId = owned.docs[0]?.id ?? null
        }
        if (!personId) {
          const base = slugify(user.name) || `member-${user.id}`
          let slug = base
          for (let i = 2; i < 50; i += 1) {
            const clash = await payload.count({ collection: 'people', where: { slug: { equals: slug } }, req })
            if (clash.totalDocs === 0) break
            slug = `${base}-${i}`
          }
          const person = await payload.create({
            collection: 'people',
            data: { name: user.name, slug, owner: user.id, onRoster: false },
            overrideAccess: true,
            req,
            context: sync,
          })
          personId = person.id
        }

        const person = await payload.findByID({ collection: 'people', id: personId, depth: 0, overrideAccess: true, req })
        let memberNumber = person.memberNumber ?? null
        const patch: Record<string, unknown> = {}
        if (memberNumber == null) {
          memberNumber = await nextMemberNumber(payload as never)
          patch.memberNumber = memberNumber
        }
        if (rel(person.owner) !== user.id) patch.owner = user.id
        if (Object.keys(patch).length) {
          await payload.update({
            collection: 'people',
            id: personId,
            data: patch,
            overrideAccess: true,
            req,
            context: { ...sync, assigningNumber: true },
          })
        }

        await payload.update({
          collection: 'users',
          id: user.id,
          data: {
            membershipPlan: act.plan,
            membershipStatus: 'active',
            membershipExpires: act.until,
            profile: personId,
            memberSince: user.memberSince ?? act.paidAt,
          },
          overrideAccess: true,
          req,
          context: sync,
        })

        // Sent inside the request transaction (Payload 3.84 has no
        // post-commit hook): a commit failure after this point would leave
        // a welcome mail for a rolled-back activation. Accepted at
        // collective scale; the log line below is the audit trail.
        sendSafe(req, {
          to: user.email,
          ...membershipActivated(user.name, memberNumber, act.plan, act.until, `${siteUrl()}/account`),
        })
        payload.logger.info({ userId: user.id, memberNumber }, 'membership: activated')
      },
    ],
  },
}
