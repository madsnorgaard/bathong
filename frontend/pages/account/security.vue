<script setup lang="ts">
/**
 * Security is a feature: the current password before any change to the
 * account, a new email that takes effect only when it confirms, the
 * devices signed in with a way to drop any of them, and the door out.
 * Four short forms under hairlines, one action each.
 */
import type { SessionInfo } from '~/composables/useAuth'
import { passwordProblem } from '~/utils/password'

definePageMeta({ middleware: 'auth' })
useShareMeta({ title: 'Security', description: 'Password, email, devices and closing your Bathong. account.' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

const {
  user,
  fetchMe,
  changePassword,
  changeEmail,
  cancelEmailChange,
  sessions: loadSessions,
  revokeSession,
  signOutEverywhere,
  deleteAccount,
} = useAuth()

const { data: sessionData, refresh: refreshSessions } = await useAsyncData(
  () => `sessions-${user.value?.id ?? 'none'}`,
  () => loadSessions().catch(() => ({ current: null, sessions: [] })),
)

const when = (iso: string) =>
  new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' }).format(new Date(iso))
const isCurrent = (s: SessionInfo) => s.id === sessionData.value?.current
const devices = computed(() =>
  [...(sessionData.value?.sessions ?? [])].sort((a, b) => Number(isCurrent(b)) - Number(isCurrent(a))),
)

// password
const current = ref('')
const next = ref('')
const pwBusy = ref(false)
const pwError = ref('')
const pwDone = ref(false)
const nextProblem = computed(() => (next.value ? passwordProblem(next.value, user.value?.email) : null))
async function submitPassword() {
  if (pwBusy.value || nextProblem.value) return
  pwBusy.value = true
  pwError.value = ''
  pwDone.value = false
  try {
    await changePassword(current.value, next.value)
    current.value = ''
    next.value = ''
    pwDone.value = true
    await refreshSessions()
  } catch (error) {
    pwError.value = (error as Error).message
  } finally {
    pwBusy.value = false
  }
}

// email
const newEmail = ref('')
const emailPassword = ref('')
const emBusy = ref(false)
const emError = ref('')
// a pending change is shown only while its link still works
const stillPending = (u: { pendingEmail?: string | null; pendingEmailExpires?: string | null } | null) =>
  u?.pendingEmail && u.pendingEmailExpires && new Date(u.pendingEmailExpires).getTime() > Date.now()
    ? u.pendingEmail
    : null
const emPending = ref<string | null>(stillPending(user.value))
const emDone = ref(false)
const cancelling = ref(false)
async function cancelPending() {
  cancelling.value = true
  emError.value = ''
  try {
    await cancelEmailChange()
    emPending.value = null
    emDone.value = false
    await fetchMe()
  } catch (error) {
    emError.value = (error as Error).message
  } finally {
    cancelling.value = false
  }
}
async function submitEmail() {
  if (emBusy.value) return
  emBusy.value = true
  emError.value = ''
  emDone.value = false
  try {
    const res = await changeEmail(emailPassword.value, newEmail.value.trim())
    emPending.value = res.pendingEmail
    emDone.value = true
    newEmail.value = ''
    emailPassword.value = ''
    await fetchMe()
  } catch (error) {
    emError.value = (error as Error).message
  } finally {
    emBusy.value = false
  }
}

// devices
const devError = ref('')
const revoking = ref<string | null>(null)
async function dropDevice(id: string) {
  revoking.value = id
  devError.value = ''
  try {
    await revokeSession(id)
    await refreshSessions()
  } catch (error) {
    devError.value = (error as Error).message
  } finally {
    revoking.value = null
  }
}
const leaving = ref(false)
async function everywhere() {
  leaving.value = true
  await signOutEverywhere()
  await navigateTo('/account/sign-in', { replace: true })
}

// closing
const delPassword = ref('')
const delArmed = ref(false)
const delBusy = ref(false)
const delError = ref('')
const closed = ref(false)
async function submitDelete() {
  if (delBusy.value) return
  if (!delArmed.value) {
    delError.value = ''
    delArmed.value = true
    return
  }
  delBusy.value = true
  delError.value = ''
  try {
    await deleteAccount(delPassword.value)
    closed.value = true
  } catch (error) {
    delError.value = (error as Error).message
    delArmed.value = false
  } finally {
    delBusy.value = false
  }
}
</script>

<template>
  <div class="chapter account-chapter">
    <ChapterHead title="Security" />

    <section v-if="closed" class="account-form">
      <p class="b-lede">Your account is closed.</p>
      <p>Your details are deleted. Work you published stays on the site with your name on it, as agreed when you published.</p>
      <BButton to="/" variant="ghost">Back to the site →</BButton>
    </section>

    <template v-else>
      <AccountNav />

      <form class="account-form block" novalidate @submit.prevent="submitPassword">
        <h3 class="b-kicker">Password</h3>
        <BField v-model="current" label="Current password" name="current" type="password" autocomplete="current-password" required />
        <BField
          v-model="next"
          label="New password"
          name="password"
          type="password"
          autocomplete="new-password"
          required
          :error="nextProblem ?? undefined"
        />
        <p class="b-caption muted">At least 10 characters. Every other device is signed out when it changes.</p>
        <p v-if="pwError" class="b-caption error" role="alert">{{ pwError }}</p>
        <p v-else-if="pwDone" class="b-caption ok" role="status">Changed. Other devices were signed out.</p>
        <BButton type="submit" variant="ghost" :disabled="pwBusy || !current || !next || Boolean(nextProblem)">
          {{ pwBusy ? 'Changing...' : 'Change password →' }}
        </BButton>
      </form>

      <form class="account-form block" novalidate @submit.prevent="submitEmail">
        <h3 class="b-kicker">Email</h3>
        <p class="b-caption muted">Signed in as {{ user?.email }}.</p>
        <p v-if="emPending && !emDone" class="b-caption pending">
          A change to {{ emPending }} is waiting for that address to confirm it.
          <button type="button" class="linkish" :disabled="cancelling" @click="cancelPending">Cancel it</button>
        </p>
        <BField v-model="newEmail" label="New email" name="newEmail" type="email" autocomplete="email" required />
        <BField v-model="emailPassword" label="Your password" name="emailPassword" type="password" autocomplete="current-password" required />
        <p v-if="emError" class="b-caption error" role="alert">{{ emError }}</p>
        <p v-else-if="emDone" class="b-caption ok" role="status">
          Check {{ emPending }}. The change happens when you confirm it there.
          <button type="button" class="linkish" :disabled="cancelling" @click="cancelPending">Cancel it</button>
        </p>
        <BButton type="submit" variant="ghost" :disabled="emBusy || !newEmail || !emailPassword">
          {{ emBusy ? 'One moment...' : 'Change email →' }}
        </BButton>
      </form>

      <section class="account-form block">
        <h3 class="b-kicker">Devices</h3>
        <ul class="b-ruled devices">
          <li v-for="s in devices" :key="s.id" class="device">
            <span class="b-caption">
              {{ isCurrent(s) ? 'This device' : 'Another device' }} · signed in {{ when(s.createdAt) }}
            </span>
            <BButton
              v-if="!isCurrent(s)"
              variant="ghost"
              size="sm"
              :disabled="revoking === s.id"
              @click="dropDevice(s.id)"
            >
              {{ revoking === s.id ? 'Signing out...' : 'Sign out' }}
            </BButton>
          </li>
        </ul>
        <p v-if="devError" class="b-caption error" role="alert">{{ devError }}</p>
        <BButton variant="ghost" :disabled="leaving" @click="everywhere">
          {{ leaving ? 'Signing out...' : 'Sign out everywhere →' }}
        </BButton>
      </section>

      <form class="account-form block" novalidate @submit.prevent="submitDelete">
        <h3 class="b-kicker">Close account</h3>
        <p class="b-caption muted">
          Your account and personal details are deleted. RSVPs and entries you made will name nobody.
          Photographs and essays you published stay on the site with your name on them, as agreed when you published.
          A membership that is running is not refunded.
        </p>
        <BField v-model="delPassword" label="Your password" name="delPassword" type="password" autocomplete="current-password" required />
        <p v-if="delError" class="b-caption error" role="alert">{{ delError }}</p>
        <p v-else-if="delArmed" class="b-caption" role="status">Are you sure? This cannot be undone.</p>
        <BButton type="submit" variant="signal" :disabled="delBusy || !delPassword">
          {{ delBusy ? 'Closing...' : delArmed ? 'Yes, delete my account →' : 'Delete my account →' }}
        </BButton>
      </form>
    </template>
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
  max-width: 28rem;
}
.block {
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--grey-line);
}
.block:last-child {
  border-bottom: 0;
}
.devices {
  margin: 0;
}
.device {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  min-height: 44px;
}
.ok {
  color: var(--signal);
}
.linkish {
  background: none;
  border: 0;
  padding: 0;
  margin-left: var(--space-2);
  font: inherit;
  color: var(--grey-fog);
  text-decoration: underline;
  cursor: pointer;
  min-height: 44px;
}
.linkish:hover {
  color: var(--signal);
}
.error {
  color: var(--signal);
}
.muted {
  color: var(--grey-ghost);
}
</style>
