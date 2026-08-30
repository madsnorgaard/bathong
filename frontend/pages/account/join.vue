<script setup lang="ts">
/**
 * Join: pick a plan, get the bank details and a reference, pay by EFT. No
 * "I have paid" button: an editor confirms the payment and the card
 * appears on the desk. Renewal opens in the last 30 days of a membership.
 */
import type { Membership } from '~/types/payload-types'
import type { JoinOrder } from '~/composables/useAuth'
import { canRenew } from '~/utils/membership'

definePageMeta({ middleware: 'auth' })
useShareMeta({ title: 'Join', description: 'Choose a plan and pay by EFT.' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

const { user, authed, join } = useAuth()

interface List<T> { docs: T[] }
const [{ data: membership }, { data: pendingData }] = await Promise.all([
  useAsyncData('join-membership', () => authed<Membership>('/api/globals/membership')),
  useAsyncData(
    () => `join-pending-${user.value?.id ?? 'none'}`,
    () =>
      authed<List<JoinOrder>>(
        '/api/orders?where[type][equals]=membership&where[status][equals]=pending&limit=1&depth=0',
      ).catch(() => ({ docs: [] })),
  ),
])

const order = ref<JoinOrder | null>(pendingData.value?.docs?.[0] ?? null)
const plan = ref<'monthly' | 'annual'>('annual')
const pending = ref(false)
const errorMessage = ref('')

const prices = computed(() => membership.value)
const hasJoined = computed(() => Boolean(user.value?.memberSince))
const renewable = computed(() => canRenew(user.value))
const runsUntil = computed(() =>
  user.value?.membershipExpires ? formatWalkDate(user.value.membershipExpires) : null,
)
const bank = computed(() => membership.value?.bank ?? null)
const contact = computed(() => 'hello@bathong.africa')

async function choose() {
  if (pending.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    order.value = await join(plan.value)
  } catch (error) {
    errorMessage.value = (error as Error).message
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="chapter account-chapter">
    <ChapterHead :title="order ? 'Pay by EFT' : 'Choose a plan'" />
    <AccountNav />

    <!-- the details of an open order -->
    <section v-if="order" class="account-form">
      <dl class="facts">
        <div><dt class="b-caption">Amount</dt><dd class="amount">{{ formatPrice(order.amount) }}</dd></div>
        <div><dt class="b-caption">Reference</dt><dd class="reference">{{ order.reference }}</dd></div>
        <template v-if="bank">
          <div v-if="bank.accountName"><dt class="b-caption">Account name</dt><dd>{{ bank.accountName }}</dd></div>
          <div v-if="bank.bankName"><dt class="b-caption">Bank</dt><dd>{{ bank.bankName }}</dd></div>
          <div v-if="bank.accountNumber"><dt class="b-caption">Account number</dt><dd>{{ bank.accountNumber }}</dd></div>
          <div v-if="bank.branchCode"><dt class="b-caption">Branch code</dt><dd>{{ bank.branchCode }}</dd></div>
          <div v-if="bank.accountType"><dt class="b-caption">Account type</dt><dd>{{ bank.accountType }}</dd></div>
        </template>
      </dl>
      <p v-if="order.joiningFee" class="b-caption muted">
        {{ formatPrice(order.joiningFee) }} of that is the joining fee, paid once.
      </p>
      <p v-if="!bank?.accountNumber" class="b-caption muted">Bank details follow by email. TBC.</p>
      <p>{{ bank?.paymentNote ?? 'Use the reference exactly as shown. We confirm EFTs by hand, usually within two working days.' }}</p>
      <p>When it shows, your card and member number appear on your desk and we email you.</p>
      <p class="b-caption"><NuxtLink to="/account">Back to your desk →</NuxtLink></p>
      <p class="b-caption muted">
        Paid the wrong amount or used the wrong reference? Write to <a :href="`mailto:${contact}`">{{ contact }}</a>.
      </p>
    </section>

    <!-- a running membership, not yet in its renewal window -->
    <section v-else-if="!renewable" class="account-form">
      <p class="b-lede">Your membership runs until {{ runsUntil }}.</p>
      <p>Renewal opens 30 days before. Nothing to do now.</p>
      <p class="b-caption"><NuxtLink to="/account">Back to your desk →</NuxtLink></p>
    </section>

    <!-- the choice -->
    <form v-else class="account-form" novalidate @submit.prevent="choose">
      <fieldset class="plans">
        <legend class="b-caption">One membership, one price</legend>
        <label class="plate" :class="{ on: plan === 'monthly' }">
          <input v-model="plan" type="radio" name="plan" value="monthly">
          <span class="plate-name">Monthly</span>
          <span class="b-caption">{{ formatPrice(prices?.priceMonthly) }} a month</span>
        </label>
        <label class="plate" :class="{ on: plan === 'annual' }">
          <input v-model="plan" type="radio" name="plan" value="annual">
          <span class="plate-name">Annual</span>
          <span class="b-caption">{{ formatPrice(prices?.priceAnnual) }} a year</span>
        </label>
      </fieldset>
      <p v-if="!hasJoined" class="b-caption muted">Plus {{ formatPrice(prices?.joiningFee) }} to join, once.</p>
      <p v-if="prices?.priceNote" class="b-caption muted">{{ prices.priceNote }}</p>
      <p v-if="errorMessage" class="b-caption error" role="alert">{{ errorMessage }}</p>
      <BButton type="submit" variant="ghost" :disabled="pending">
        {{ pending ? 'One moment...' : 'Give me the details →' }}
      </BButton>
    </form>
  </div>
</template>

<style scoped>
.account-chapter {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.account-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 32rem;
}
.facts {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: var(--space-4);
  border: 2px solid var(--paper);
}
.facts dt {
  color: var(--grey-ghost);
}
.facts dd {
  margin: 2px 0 0;
}
.amount,
.reference {
  font-family: var(--font-display);
  font-size: var(--text-display-2);
  line-height: var(--leading-display);
  text-transform: uppercase;
}
.reference {
  color: var(--signal);
  user-select: all;
}
.plans {
  border: 0;
  padding: 0;
  margin: 0;
  display: grid;
  gap: var(--space-3);
}
.plans legend {
  color: var(--grey-ghost);
  margin-bottom: var(--space-3);
}
.plate {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 44px;
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--grey-line);
  cursor: pointer;
}
.plate.on {
  border-color: var(--signal);
}
.plate input {
  accent-color: var(--jacaranda);
  width: 18px;
  height: 18px;
}
.plate-name {
  font-family: var(--font-display);
  text-transform: uppercase;
  flex: 1;
}
.error {
  color: var(--signal);
}
.muted {
  color: var(--grey-ghost);
}
.b-caption a,
.muted a {
  color: var(--grey-fog);
}
.b-caption a:hover {
  color: var(--signal);
}
</style>
