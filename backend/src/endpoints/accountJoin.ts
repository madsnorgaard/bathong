import type { Endpoint, PayloadRequest } from 'payload'
import type { Order } from '../payload-types'
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

    const findPending = () =>
      payload.find({
        collection: 'orders',
        where: {
          and: [{ user: { equals: user.id } }, { type: { equals: 'membership' } }, { status: { equals: 'pending' } }],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
    const membership = await payload.findGlobal({ slug: 'membership', depth: 0, overrideAccess: true, req })
    const price = orderAmount(membership, Boolean(user.memberSince), plan)
    if (!price) return bad('Membership prices are not set yet. Write to us and we sort it by hand.')

    const bank = membership.bank ?? {}
    const contact = await getContactEmail(req)
    const instructions = (reference: string) =>
      sendSafe(req, {
        to: user.email,
        replyTo: contact,
        ...joinInstructions(user.name, { plan, amount: price.amount, joiningFee: price.joiningFee, reference }, bank),
      })

    // One open order per account. Asking again with the same plan returns
    // it; a different plan moves the open order over (nothing is paid yet,
    // the reference stays) and the instructions go out again.
    const open = (await findPending()).docs[0]
    if (open) {
      if (open.plan === plan) return ok(shape(open))
      const moved = await payload.update({
        collection: 'orders',
        id: open.id,
        data: { plan, amount: price.amount, joiningFee: price.joiningFee },
        overrideAccess: true,
        req,
      })
      instructions(moved.reference ?? '')
      payload.logger.info({ userId: user.id, orderId: moved.id, plan }, 'join: open order moved to another plan')
      return ok(shape(moved))
    }

    let order: Order | null = null
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
        // Two joins in the same instant: the one-open-order index refuses
        // the second, which then answers with the first.
        const raced = (await findPending()).docs[0]
        if (raced) return ok(shape(raced))
        if (attempt === 2) throw err
        payload.logger.info({ err }, 'join: reference clash, retrying')
      }
    }
    if (!order) return bad('Could not make the order. Try again.', 500)

    instructions(order.reference ?? '')
    sendSafe(req, {
      to: contact,
      ...editorNewJoin(user.name, user.email, plan, price.amount, order.reference ?? '', `${payload.config.serverURL}/admin/collections/orders/${order.id}`),
    })
    payload.logger.info({ userId: user.id, orderId: order.id }, 'join: order created')
    return ok(shape(order), 201)
  },
}
