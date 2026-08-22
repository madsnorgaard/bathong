<script setup lang="ts">
/**
 * Forgotten password. Confirms in writing whatever the address is, so the
 * form never reveals which emails have accounts. The link in the email
 * lands on /account/reset.
 */
useShareMeta({ title: 'Reset password', description: 'Reset a Bathong. member password.' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

const { forgotPassword } = useAuth()

const email = ref('')
const pending = ref(false)
const sent = ref(false)
const errorMessage = ref('')

async function submit() {
  if (pending.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    await forgotPassword(email.value.trim())
    sent.value = true
  } catch {
    errorMessage.value = 'The request did not go through. Check your connection and try again.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="chapter account-chapter">
    <ChapterHead title="Reset password" />
    <div v-if="sent" class="account-form">
      <p class="b-lede">Sent.</p>
      <p>
        If {{ email }} has an account, a reset link is on its way. It works for one hour. No email
        within a few minutes: check spam, or write to us.
      </p>
      <p class="b-caption"><NuxtLink to="/account/sign-in">Back to sign in →</NuxtLink></p>
    </div>
    <form v-else class="account-form" novalidate @submit.prevent="submit">
      <p>Give us the email on the account and we send a link to set a new password.</p>
      <BField v-model="email" label="Email" name="email" type="email" required autocomplete="email" />
      <p v-if="errorMessage" class="b-caption error" role="alert">{{ errorMessage }}</p>
      <BButton type="submit" variant="ghost" :disabled="pending || !email">
        {{ pending ? 'Sending...' : 'Send the link →' }}
      </BButton>
      <p class="b-caption"><NuxtLink to="/account/sign-in">Back to sign in →</NuxtLink></p>
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
