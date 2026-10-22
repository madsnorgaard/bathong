import type { Payload, PayloadRequest, TaskConfig } from 'payload'
import { getContactEmail, sendSafe } from '../email/send'
import { membershipLapsed, renewalReminder } from '../email/templates'
import { openMembershipOrder } from '../endpoints/accountJoin'
import { RENEWAL_WINDOW_DAYS, daysUntil, noticeDue, type NoticeKind, type Plan } from '../lib/membership'
import { siteUrl } from '../lib/siteUrl'

/**
 * Renewal reminders and the lapse notice (#83). Runs once a day from the
 * jobs queue; `runMembershipNotices` is the whole of it, so the e2e door
 * can run it on a chosen day. It writes no membership state: the Orders
 * hooks stay the single writer. What it writes is one membership-notices
 * row per notice (sent or overtaken) for one expiry, which is what makes a
 * re-run send nothing twice. A member who renews gets a new expiry, and
 * the old one's rows no longer match anything.
 */
export interface NoticesRun {
  checked: number
  sent: { userId: number; kind: NoticeKind; expires: string }[]
}

export async function runMembershipNotices(payload: Payload, req: PayloadRequest, now = new Date()): Promise<NoticesRun> {
  const horizon = new Date(now.getTime() + (RENEWAL_WINDOW_DAYS + 1) * 86_400_000).toISOString()
  // stored status, not the read-time one: a lapsed membership is still
  // `active` in the row, which is what makes the lapse notice findable
  const members = await payload.find({
    collection: 'users',
    where: {
      and: [
        { membershipStatus: { equals: 'active' } },
        { membershipExpires: { less_than: horizon } },
        { membershipExpires: { exists: true } },
      ],
    },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const run: NoticesRun = { checked: members.docs.length, sent: [] }
  if (!members.docs.length) return run

  const membership = await payload.findGlobal({ slug: 'membership', depth: 0, overrideAccess: true, req })
  const contact = await getContactEmail(req)
  const joinLink = `${siteUrl()}/account/join`

  for (const user of members.docs) {
    const expires = user.membershipExpires as string
    const already = await payload.find({
      collection: 'membership-notices',
      where: { and: [{ user: { equals: user.id } }, { expires: { equals: expires } }] },
      limit: 10,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const due = noticeDue(expires, new Set(already.docs.map((n) => n.kind as NoticeKind)), now)
    if (!due) continue

    // the row first: if two runs overlap, the unique index lets one through
    const stamp = now.toISOString()
    try {
      await payload.create({
        collection: 'membership-notices',
        data: { user: user.id, kind: due.send, expires, outcome: 'sent', sentAt: stamp },
        overrideAccess: true,
        req,
      })
    } catch (err) {
      payload.logger.info({ err, userId: user.id, kind: due.send }, 'membership notices: already recorded, skipping')
      continue
    }
    for (const kind of due.overtaken) {
      await payload.create({
        collection: 'membership-notices',
        data: { user: user.id, kind, expires, outcome: 'overtaken', sentAt: stamp },
        overrideAccess: true,
        req,
      })
    }

    if (due.send === 'lapsed') {
      sendSafe(req, { to: user.email, replyTo: contact, ...membershipLapsed(user.name, expires, joinLink) })
    } else {
      const plan = (user.membershipPlan === 'annual' ? 'annual' : 'monthly') as Plan
      let order: { plan: string; amount: number; reference: string } | null = null
      try {
        const found = await openMembershipOrder(payload, req, user, plan, membership)
        if (found?.order.reference && typeof found.order.amount === 'number') {
          order = { plan, amount: found.order.amount, reference: found.order.reference }
        }
      } catch (err) {
        payload.logger.error({ err, userId: user.id }, 'membership notices: could not open the renewal order')
      }
      sendSafe(req, {
        to: user.email,
        replyTo: contact,
        ...renewalReminder(user.name, Math.max(daysUntil(expires, now), 0), expires, order, membership.bank ?? {}, joinLink),
      })
    }
    payload.logger.info({ userId: user.id, kind: due.send, expires }, 'membership notices: sent')
    run.sent.push({ userId: user.id, kind: due.send, expires })
  }
  return run
}

/** Queued every morning at 06:00 UTC (08:00 in Pretoria) and run by autoRun. */
export const membershipNoticesTask: TaskConfig = {
  slug: 'membershipNotices',
  retries: 0,
  schedule: [{ cron: '0 6 * * *', queue: 'nightly' }],
  handler: async ({ req }) => {
    const result = await runMembershipNotices(req.payload, req)
    return { output: { checked: result.checked, sent: result.sent.length } }
  },
}
