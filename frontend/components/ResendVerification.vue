<script setup lang="ts">
/**
 * One field, one action: send the confirmation link again. Confirms in
 * writing whatever the address is, so it never reveals who has an account.
 */
const props = defineProps<{ email?: string }>()

const { resendVerification } = useAuth()
const email = ref(props.email ?? '')
const pending = ref(false)
const sent = ref(false)
const errorMessage = ref('')

async function submit() {
  if (pending.value || !email.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    await resendVerification(email.value.trim())
    sent.value = true
  } catch (error) {
    errorMessage.value = (error as Error).message
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="resend">
    <p v-if="sent" class="b-caption" role="status">
      Sent. If {{ email }} has an unconfirmed account, a new link is on its way. Look in junk too.
    </p>
    <form v-else class="resend-form" novalidate @submit.prevent="submit">
      <BField v-model="email" label="Email" name="resend-email" type="email" required autocomplete="email" />
      <p v-if="errorMessage" class="b-caption error" role="alert">{{ errorMessage }}</p>
      <BButton type="submit" variant="ghost" size="sm" :disabled="pending || !email">
        {{ pending ? 'Sending...' : 'Send it again →' }}
      </BButton>
    </form>
  </div>
</template>

<style scoped>
.resend-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.error {
  color: var(--signal);
}
</style>
