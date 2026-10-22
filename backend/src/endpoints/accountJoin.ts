import type { Endpoint, Payload, PayloadRequest } from 'payload'
import type { Membership, Order, User } from '../payload-types'
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

/**
 * The account's one open membership order, found or made. Asking again with
 * the same plan returns it; a different plan moves the open order over
 * (nothing is paid yet, the reference stays). Two joins in the same instant
 * answer with the same order: the one-open-order index refuses the second.
 * The renewal reminder job uses this too, so a member always has one
 * reference whichever door they came through (#83).
 */
export async function openMembershipOrder(
  payload: Payload,
  req: PayloadRequest,
  user: Pick<User, 'id' | 'memberSince'>,
  plan: Plan,
  membership: Pick<Membership, 'joiningFee' | 'priceMonthly' | 'priceAnnual' | 'referencePrefix'>,
): Promise<{ order: Order; created: boolean; moved: boolean } | null> {
  const price = orderAmount(membership, Boolean(user.memberSince), plan)
  if (!price) return null
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
  const open = (await findPending()).docs[0]
  if (open) {
    if (open.plan === plan) return { order: open, created: false, moved: false }
    const moved = await payload.update({
      collection: 'orders',
      id: open.id,
      data: { plan, amount: price.amount, joiningFee: price.joiningFee },
      overrideAccess: true,
      req,
    })
    payload.logger.info({ userId: user.id, orderId: moved.id, plan }, 'join: open order moved to another plan')
    return { order: moved, created: false, moved: true }
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
      const raced = (await findPending()).docs[0]
      if (raced) return { order: raced, created: false, moved: false }
      if (attempt === 2) throw err
      payload.logger.info({ err }, 'join: reference clash, retrying')
    }
  }
  if (!order) return null
  payload.logger.info({ userId: user.id, orderId: order.id }, 'join: order created')
  return { order, created: true, moved: false }
}

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

    const membership = await payload.findGlobal({ slug: 'membership', depth: 0, overrideAccess: true, req })
    const price = orderAmount(membership, Boolean(user.memberSince), plan)
    if (!price) return bad('Membership prices are not set yet. Write to us and we sort it by hand.')

    let found: Awaited<ReturnType<typeof openMembershipOrder>>
    try {
      found = await openMembershipOrder(payload, req, user, plan, membership)
    } catch {
      return bad('Could not make the order. Try again.', 500)
    }
    if (!found) return bad('Could not make the order. Try again.', 500)
    const { order, created, moved } = found
    if (!created && !moved) return ok(shape(order))

    // the instructions go out on a new order and again when it moves plan
    const contact = await getContactEmail(req)
    sendSafe(req, {
      to: user.email,
      replyTo: contact,
      ...joinInstructions(user.name, { plan, amount: price.amount, joiningFee: price.joiningFee, reference: order.reference ?? '' }, membership.bank ?? {}),
    })
    if (!created) return ok(shape(order))
    sendSafe(req, {
      to: contact,
      ...editorNewJoin(user.name, user.email, plan, price.amount, order.reference ?? '', `${payload.config.serverURL}/admin/collections/orders/${order.id}`),
    })
    return ok(shape(order), 201)
  },
}
