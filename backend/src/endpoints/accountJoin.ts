import type { Endpoint, PayloadRequest } from 'payload'
import { getContactEmail, sendSafe } from '../email/send'
import { editorNewJoin, joinInstructions } from '../email/templates'
import { PLANS, RENEWAL_WINDOW_DAYS, daysUntil, makeReference, orderAmount, type Plan } from '../lib/membership'
import { bad, ok, readJson } from './respond'

/**
 * Join: a signed-in account picks a plan and gets an order with an EFT
 * reference. One open membership order per account (asking again returns
 * it); a running membership can renew inside the last 30 days. The order's
 * status is flipped by an editor when the payment shows; that is where
 * activation happens (Orders hooks).
 */
const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-ZA', { dateStyle: 'long', timeZone: 'Africa/Johannesburg' }).format(new Date(iso))

const shape = (o: { reference?: string | null; amount?: number | null; joiningFee?: number | null; plan?: string | null; status?: string | null }) => ({
  reference: o.reference,
  amount: o.amount,
  joiningFee: o.joiningFee ?? 0,
  plan: o.plan,
  status: o.status,
})

export const accountJoin: Endpoint = {
  path: '/account/join',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!req.user) return bad('Sign in first.', 401)
    const body = await readJson(req)
    const plan = body?.plan as Plan
    if (!PLANS.includes(plan)) return bad('Choose monthly or annual.')

    const { payload } = req
    const user = await payload.findByID({ collection: 'users', id: req.user.id, depth: 0, overrideAccess: true, req })

    if (user.membershipStatus === 'active' && user.membershipExpires) {
      const left = daysUntil(user.membershipExpires)
      if (left > RENEWAL_WINDOW_DAYS) {
        return bad(
          `Your membership runs until ${longDate(user.membershipExpires)}. Renewal opens ${RENEWAL_WINDOW_DAYS} days before.`,
        )
      }
    }

    const pending = await payload.find({
      collection: 'orders',
      where: {
        and: [{ user: { equals: user.id } }, { type: { equals: 'membership' } }, { status: { equals: 'pending' } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (pending.docs[0]) return ok(shape(pending.docs[0]))

    const membership = await payload.findGlobal({ slug: 'membership', depth: 0, overrideAccess: true, req })
    const price = orderAmount(membership, Boolean(user.memberSince), plan)
    if (!price) return bad('Membership prices are not set yet. Write to us and we sort it by hand.')

    let order: (typeof pending.docs)[number] | null = null
    for (let attempt = 0; attempt < 3 && !order; attempt += 1) {
      const reference = makeReference(membership.referencePrefix ?? 'BTG')
      try {
        order = await payload.create({
          collection: 'orders',
          data: {
            user: user.id,
            type: 'membership',
            plan,
            amount: price.amount,
            joiningFee: price.joiningFee,
            currency: 'ZAR',
            reference,
            status: 'pending',
            provider: 'manual',
          },
          overrideAccess: true,
          req,
        })
      } catch (err) {
        if (attempt === 2) throw err
        payload.logger.info({ err }, 'join: reference clash, retrying')
      }
    }
    if (!order) return bad('Could not make the order. Try again.', 500)

    const bank = membership.bank ?? {}
    const contact = await getContactEmail(req)
    sendSafe(req, {
      to: user.email,
      replyTo: contact,
      ...joinInstructions(user.name, { plan, amount: price.amount, joiningFee: price.joiningFee, reference: order.reference ?? '' }, bank),
    })
    sendSafe(req, {
      to: contact,
      ...editorNewJoin(user.name, user.email, plan, price.amount, order.reference ?? '', `${payload.config.serverURL}/admin/collections/orders/${order.id}`),
    })
    payload.logger.info({ userId: user.id, orderId: order.id }, 'join: order created')
    return ok(shape(order), 201)
  },
}
