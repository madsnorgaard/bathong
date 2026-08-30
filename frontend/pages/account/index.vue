<script setup lang="ts">
/**
 * The desk (#13, #40): the card first, then what the member is part of:
 * the next walk, their RSVPs, their photocall entries with the written
 * response, their published work, their payments. Members never see
 * /admin; this is their desk. Prices and dates are shown only when real,
 * otherwise TBC.
 */
import type { Person, Photocall, Submission, Rsvp, Walk, Frame } from '~/types/payload-types'
import type { JoinOrder } from '~/composables/useAuth'
import { richTextBlocks } from '~/utils/richtext'
import { formatWalkDate } from '~/utils/format'
import { effectiveStatus } from '~/utils/membership'

definePageMeta({ middleware: 'auth' })

useShareMeta({ title: 'Desk', description: 'Your Bathong. desk.' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

const { user, authed, logout } = useAuth()

const profile = computed<Person | null>(() =>
  user.value?.profile && typeof user.value.profile === 'object' ? user.value.profile : null,
)
const status = computed(() => effectiveStatus(user.value))

interface List<T> { docs: T[] }
type Order = JoinOrder & { id: number; paidAt?: string | null; createdAt?: string | null }
const key = (name: string) => () => `desk-${name}-${user.value?.id ?? 'none'}`
const quiet = <T,>(promise: Promise<List<T>>) => promise.catch(() => ({ docs: [] as T[] }))

const [{ data: submissionsData }, { data: rsvpsData }, { data: ordersData }, { data: nextWalkData }, { data: framesData }] =
  await Promise.all([
    useAsyncData(key('submissions'), () =>
      quiet(authed<List<Submission>>('/api/submissions?depth=1&sort=-createdAt&limit=50')),
    ),
    useAsyncData(key('rsvps'), () => quiet(authed<List<Rsvp>>('/api/rsvps?depth=1&sort=-createdAt&limit=20'))),
    useAsyncData(key('orders'), () =>
      quiet(authed<List<Order>>('/api/orders?where[type][equals]=membership&sort=-createdAt&limit=20&depth=0')),
    ),
    useCmsData<List<Walk>>('walks-next', nextWalksQuery(new Date().toISOString(), 1)),
    useAsyncData(key('frames'), () =>
      profile.value
        ? quiet(
            authed<List<Frame>>(
              `/api/frames?where[photographer][equals]=${profile.value.id}&sort=-createdAt&limit=6&depth=1`,
            ),
          )
        : Promise.resolve({ docs: [] as Frame[] }),
    ),
  ])

const submissions = computed(() => submissionsData.value?.docs ?? [])
const rsvps = computed(() => rsvpsData.value?.docs ?? [])
const orders = computed(() => ordersData.value?.docs ?? [])
const pendingOrder = computed(() => orders.value.find((o) => o.status === 'pending') ?? null)
const nextWalk = computed(() => nextWalkData.value?.docs?.[0] ?? null)
const frames = computed(() => framesData.value?.docs ?? [])

const cardState = computed<'member' | 'pending' | 'none'>(() =>
  status.value === 'active' ? 'member' : pendingOrder.value ? 'pending' : 'none',
)

const VERDICT: Record<string, string> = {
  submitted: 'Received',
  shortlisted: 'Shortlisted',
  published: 'Published',
  rejected: 'Not this time',
}
const RSVP_STATUS: Record<string, string> = { confirmed: 'On the list', waitlist: 'Waitlist', cancelled: 'Cancelled' }
const ORDER_STATUS: Record<string, string> = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}
function callTitle(s: Submission): string {
  const call = s.photocall as Photocall | number
  return typeof call === 'object' ? call.title : 'Photocall'
}
function rsvpWalk(r: Rsvp): Walk | null {
  return r.walk && typeof r.walk === 'object' ? r.walk : null
}

const signingOut = ref(false)
async function signOut() {
  signingOut.value = true
  await logout()
  await navigateTo('/', { replace: true })
}
</script>

<template>
  <div class="chapter account-chapter">
    <ChapterHead title="Desk" />
    <AccountNav :show-join="status !== 'active'" />

    <section v-if="user" class="card-block">
      <MemberCard
        :state="cardState"
        :name="user.name"
        :number="profile?.memberNumber"
        :plan="user.membershipPlan"
        :since="user.memberSince"
        :based-in="profile?.basedIn"
        :reference="pendingOrder?.reference"
      />
      <dl class="facts b-caption">
        <div><dt>Signed in as</dt><dd>{{ user.email }}</dd></div>
        <div v-if="status === 'active' && user.membershipExpires"><dt>Runs until</dt><dd>{{ formatWalkDate(user.membershipExpires) }}</dd></div>
        <div v-else-if="status === 'lapsed'"><dt>Membership</dt><dd>Lapsed. <NuxtLink to="/account/join">Renew →</NuxtLink></dd></div>
      </dl>
      <p v-if="profile?.slug && profile.onRoster" class="b-caption">
        <NuxtLink :to="`/photographers/${profile.slug}`">Your public page →</NuxtLink>
      </p>
    </section>

    <!-- the next walk, one CTA -->
    <EventBlock v-if="nextWalk" :walk="nextWalk" class="next-walk">
      <BButton :to="walkPath(nextWalk)" variant="ghost">Reserve a place →</BButton>
    </EventBlock>

    <section class="list">
      <h3 class="b-kicker">Your RSVPs</h3>
      <p v-if="!rsvps.length" class="b-caption muted">No RSVPs yet.</p>
      <ul v-else class="b-ruled">
        <li v-for="r in rsvps" :key="r.id">
          <div class="row">
            <NuxtLink v-if="rsvpWalk(r)" :to="walkPath(rsvpWalk(r)!)" class="b-kicker">{{ rsvpWalk(r)!.title }}</NuxtLink>
            <span v-else class="b-kicker">A walk</span>
            <BTag>{{ RSVP_STATUS[r.status ?? 'confirmed'] ?? r.status }}</BTag>
          </div>
          <p v-if="rsvpWalk(r)" class="b-caption muted">{{ formatWalkDate(rsvpWalk(r)!.date) }}</p>
        </li>
      </ul>
    </section>

    <section class="list">
      <h3 class="b-kicker">Photocall entries</h3>
      <p v-if="!submissions.length" class="b-caption muted">
        Nothing yet. The next open call is on <NuxtLink to="/photocalls">Photocalls →</NuxtLink>
      </p>
      <ul v-else class="b-ruled">
        <li v-for="s in submissions" :key="s.id">
          <div class="row">
            <span class="b-kicker">{{ callTitle(s) }}</span>
            <BTag>{{ VERDICT[s.status ?? 'submitted'] ?? s.status }}</BTag>
          </div>
          <p v-if="s.title">{{ s.title }}</p>
          <p class="b-caption muted">
            {{ s.images?.length ?? 0 }} frame{{ (s.images?.length ?? 0) === 1 ? '' : 's' }}
            <template v-if="s.createdAt"> · {{ formatWalkDate(s.createdAt) }}</template>
          </p>
          <div v-if="s.reviewNotes" class="notes">
            <p class="b-kicker">The response</p>
            <template v-for="(block, i) in richTextBlocks(s.reviewNotes)" :key="i">
              <p v-if="block.type === 'p'">{{ block.text }}</p>
              <ul v-else>
                <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
              </ul>
            </template>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="frames.length" class="list">
      <h3 class="b-kicker">Your work</h3>
      <FeedGrid :frames="frames as never" />
      <p v-if="profile?.slug" class="b-caption">
        <NuxtLink :to="`/archive?photographer=${encodeURIComponent(profile.slug)}`">All your frames in the archive →</NuxtLink>
      </p>
    </section>

    <section class="list">
      <h3 class="b-kicker">Payments</h3>
      <p v-if="!orders.length" class="b-caption muted">
        No payments yet.<template v-if="status !== 'active'"> <NuxtLink to="/account/join">Join →</NuxtLink></template>
      </p>
      <ul v-else class="b-ruled">
        <li v-for="o in orders" :key="o.id">
          <div class="row">
            <span class="b-kicker">{{ o.reference }} · {{ planLabel(o.plan) }}</span>
            <BTag>{{ ORDER_STATUS[o.status] ?? o.status }}</BTag>
          </div>
          <p class="b-caption muted">
            {{ formatPrice(o.amount) }}<template v-if="o.paidAt"> · paid {{ formatWalkDate(o.paidAt) }}</template>
            <template v-else-if="o.status === 'pending'"> · <NuxtLink to="/account/join">How to pay →</NuxtLink></template>
          </p>
        </li>
      </ul>
    </section>

    <p class="actions">
      <BButton variant="ghost" size="sm" :disabled="signingOut" @click="signOut">
        {{ signingOut ? 'Signing out...' : 'Sign out →' }}
      </BButton>
    </p>
  </div>
</template>

<style scoped>
.account-chapter {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: 48rem;
}
.card-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin: 0;
}
.facts dt {
  color: var(--grey-ghost);
}
.facts dd {
  margin: 4px 0 0;
  color: var(--paper);
}
.facts a,
.b-caption a {
  color: var(--signal);
}
.next-walk {
  margin: 0 calc(-1 * var(--space-4));
}
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
}
.row a {
  color: var(--paper);
}
.row a:hover {
  color: var(--signal);
}
.notes {
  border-left: 2px solid var(--jacaranda);
  padding-left: var(--space-3);
  margin-top: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.muted {
  color: var(--grey-fog);
}
.actions {
  margin-top: var(--space-3);
}
</style>
