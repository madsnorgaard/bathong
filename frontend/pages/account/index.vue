<script setup lang="ts">
/**
 * The member's own page (#13): who they are on the roster, where their
 * membership stands, and their photocall submissions with the written
 * response, frame by frame. Members never see /admin; this is their desk.
 * Prices and dates are shown only when real - otherwise TBC.
 */
import type { Person, Photocall, Submission } from '~/types/payload-types'
import { richTextBlocks } from '~/utils/richtext'
import { formatWalkDate } from '~/utils/format'

definePageMeta({ middleware: 'auth' })

useShareMeta({ title: 'Account', description: 'Your Bathong. membership.' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

const { user, authed, logout } = useAuth()

const profile = computed<Person | null>(() =>
  user.value?.profile && typeof user.value.profile === 'object' ? user.value.profile : null,
)
const memberNumber = computed(() =>
  profile.value?.memberNumber ? `№ ${String(profile.value.memberNumber).padStart(4, '0')}` : null,
)

const TIER: Record<string, string> = { individual: 'Individual', student: 'Student' }
const STATUS: Record<string, string> = { active: 'Active', lapsed: 'Lapsed' }
const tier = computed(() => TIER[user.value?.membershipTier ?? ''] ?? 'TBC')
const status = computed(() => STATUS[user.value?.membershipStatus ?? ''] ?? 'TBC')
const expires = computed(() =>
  user.value?.membershipExpires ? formatWalkDate(user.value.membershipExpires) : 'TBC',
)

interface List<T> { docs: T[] }
const { data: submissionsData } = await useAsyncData(
  () => `account-submissions-${user.value?.id ?? 'none'}`,
  () =>
    authed<List<Submission>>('/api/submissions?depth=1&sort=-createdAt&limit=50').catch(
      () => ({ docs: [] }),
    ),
)
const submissions = computed(() => submissionsData.value?.docs ?? [])

const VERDICT: Record<string, string> = {
  submitted: 'Received',
  shortlisted: 'Shortlisted',
  published: 'Published',
  rejected: 'Not this time',
}
function callTitle(s: Submission): string {
  const call = s.photocall as Photocall | number
  return typeof call === 'object' ? call.title : 'Photocall'
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
    <ChapterHead title="Member" />

    <section v-if="user" class="card">
      <p class="b-kicker">{{ memberNumber ?? 'Member' }}</p>
      <h2 class="b-display-2">{{ user.name }}</h2>
      <p class="b-caption">{{ user.email }}</p>
      <dl class="facts b-caption">
        <div><dt>Tier</dt><dd>{{ tier }}</dd></div>
        <div><dt>Status</dt><dd>{{ status }}</dd></div>
        <div><dt>Renews</dt><dd>{{ expires }}</dd></div>
      </dl>
      <p v-if="profile?.slug" class="b-caption">
        <NuxtLink :to="`/photographers/${profile.slug}`">Your public page →</NuxtLink>
      </p>
    </section>

    <section class="submissions">
      <h3 class="b-kicker">Photocall submissions</h3>
      <p v-if="!submissions.length" class="b-caption muted">
        Nothing yet. The next open call is on <NuxtLink to="/photocalls">Photocalls →</NuxtLink>
      </p>
      <ul v-else class="b-ruled">
        <li v-for="s in submissions" :key="s.id">
          <div class="row">
            <span class="b-kicker">{{ callTitle(s) }}</span>
            <span class="verdict b-caption">{{ VERDICT[s.status ?? 'submitted'] ?? s.status }}</span>
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

    <p class="actions">
      <BButton variant="ghost" size="sm" :disabled="signingOut" @click="signOut">
        {{ signingOut ? 'Signing out...' : 'Sign out →' }}
      </BButton>
    </p>
  </div>
</template>

<style scoped>
.account-chapter {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: 48rem;
}
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 2px solid var(--paper);
}
.card .b-kicker {
  color: var(--signal);
}
.facts {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-top: var(--space-2);
}
.facts dt {
  color: var(--grey-ghost);
}
.facts dd {
  color: var(--paper);
}
.submissions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.submissions li {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}
.verdict {
  color: var(--signal);
}
.muted {
  color: var(--grey-fog);
}
.notes {
  margin-top: var(--space-2);
  padding-left: var(--space-3);
  border-left: 2px solid var(--jacaranda);
}
a {
  color: var(--grey-fog);
}
a:hover {
  color: var(--signal);
}
</style>
