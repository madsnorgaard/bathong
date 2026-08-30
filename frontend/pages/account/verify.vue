<script setup lang="ts">
/**
 * The link from the confirmation email lands here (?token=), and the link
 * from a new address confirming an email change (?kind=email&token=). The
 * token is posted on the client, once, so a mail scanner opening the link
 * cannot burn it before the member does; the result replaces the page.
 */
useShareMeta({ title: 'Confirm your email', description: 'Confirm the email on your Bathong. account.' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

const route = useRoute()
const { verifyEmail, confirmEmailChange } = useAuth()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const emailChange = computed(() => route.query.kind === 'email')
const state = ref<'idle' | 'working' | 'done' | 'failed'>('idle')
const errorMessage = ref('')

async function confirm() {
  if (!token.value || state.value === 'working') return
  state.value = 'working'
  try {
    if (emailChange.value) await confirmEmailChange(token.value)
    else await verifyEmail(token.value)
    state.value = 'done'
  } catch (error) {
    errorMessage.value = (error as Error).message
    state.value = 'failed'
  }
}

onMounted(() => {
  if (token.value) confirm()
})
</script>

<template>
  <div class="chapter account-chapter">
    <ChapterHead :title="emailChange ? 'Confirm your new email' : 'Confirm your email'" />
    <div class="account-form">
      <template v-if="!token">
        <p>This link is missing its token. Open the link from the email again, or ask for a new one.</p>
        <ResendVerification />
      </template>
      <p v-else-if="state === 'idle' || state === 'working'" class="b-caption" aria-live="polite">
        Confirming...
      </p>
      <template v-else-if="state === 'done' && emailChange">
        <p class="b-lede">Your new address is set.</p>
        <p>You were signed out everywhere. Sign in with it.</p>
        <BButton to="/account/sign-in" variant="ghost">Sign in →</BButton>
      </template>
      <template v-else-if="state === 'done'">
        <p class="b-lede">Confirmed.</p>
        <p>Your email is confirmed. Sign in to your desk.</p>
        <BButton to="/account/sign-in" variant="ghost">Sign in →</BButton>
      </template>
      <template v-else-if="emailChange">
        <p class="b-lede">That link did not work.</p>
        <p class="b-caption error" role="alert">{{ errorMessage }}</p>
        <p class="b-caption"><NuxtLink to="/account/security">Ask for the change again from your security page →</NuxtLink></p>
      </template>
      <template v-else>
        <p class="b-lede">That link did not work.</p>
        <p class="b-caption error" role="alert">{{ errorMessage }} It may be used or expired.</p>
        <ResendVerification />
      </template>
    </div>
  </div>
</template>

<style scoped>
.account-chapter {
  min-height: 60vh;
}
.account-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 28rem;
}
.error {
  color: var(--signal);
}
</style>
