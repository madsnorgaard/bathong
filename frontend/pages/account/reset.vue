<script setup lang="ts">
/**
 * Set a new password from the emailed link (?token=). A successful reset
 * also signs the member in, so they land straight on their account.
 */
useShareMeta({ title: 'Set a new password', description: 'Set a new Bathong. member password.' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

const route = useRoute()
const { resetPassword } = useAuth()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const password = ref('')
const confirm = ref('')
const pending = ref(false)
const errorMessage = ref('')

const MIN = 8
const mismatch = computed(() => Boolean(confirm.value) && confirm.value !== password.value)
const tooShort = computed(() => Boolean(password.value) && password.value.length < MIN)
const canSend = computed(
  () => Boolean(token.value && password.value && confirm.value) && !mismatch.value && !tooShort.value && !pending.value,
)

async function submit() {
  if (!canSend.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    await resetPassword(token.value, password.value)
    await navigateTo('/account', { replace: true })
  } catch (error) {
    errorMessage.value = (error as Error).message
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="chapter account-chapter">
    <ChapterHead title="New password" />
    <div v-if="!token" class="account-form">
      <p>This link is missing its token. Open the link from the email again, or ask for a new one.</p>
      <p class="b-caption"><NuxtLink to="/account/forgot">Send a new link →</NuxtLink></p>
    </div>
    <form v-else class="account-form" novalidate @submit.prevent="submit">
      <BField
        v-model="password"
        label="New password"
        name="password"
        type="password"
        required
        autocomplete="new-password"
        :error="tooShort ? `At least ${MIN} characters.` : undefined"
      />
      <BField
        v-model="confirm"
        label="Again, to be sure"
        name="confirm"
        type="password"
        required
        autocomplete="new-password"
        :error="mismatch ? 'The two passwords differ.' : undefined"
      />
      <p v-if="errorMessage" class="b-caption error" role="alert">{{ errorMessage }}</p>
      <BButton type="submit" variant="ghost" :disabled="!canSend">
        {{ pending ? 'Saving...' : 'Set the password →' }}
      </BButton>
    </form>
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
.b-caption a {
  color: var(--grey-fog);
}
.b-caption a:hover {
  color: var(--signal);
}
</style>
