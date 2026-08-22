<script setup lang="ts">
/**
 * Member sign-in (#13). One form, no marketing: members already know why
 * they are here. Anonymous visitors who hit a member page arrive with
 * ?next= and go back there afterwards (same-site paths only).
 */
import { safeNextPath } from '~/utils/auth'

useShareMeta({ title: 'Sign in', description: 'Member sign-in for the Bathong. collective.' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

const route = useRoute()
const { user, login } = useAuth()

const next = computed(() => safeNextPath(route.query.next))

// Already in: nothing to sign.
if (user.value) await navigateTo(next.value, { replace: true })

const email = ref('')
const password = ref('')
const pending = ref(false)
const errorMessage = ref('')

async function submit() {
  if (pending.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    await login(email.value.trim(), password.value)
    await navigateTo(next.value, { replace: true })
  } catch (error) {
    errorMessage.value = (error as Error).message
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="chapter account-chapter">
    <ChapterHead title="Sign in" />
    <form class="account-form" novalidate @submit.prevent="submit">
      <BField v-model="email" label="Email" name="email" type="email" required autocomplete="email" />
      <BField
        v-model="password"
        label="Password"
        name="password"
        type="password"
        required
        autocomplete="current-password"
      />
      <p v-if="errorMessage" class="b-caption error" role="alert">{{ errorMessage }}</p>
      <BButton type="submit" variant="ghost" :disabled="pending || !email || !password">
        {{ pending ? 'Signing in...' : 'Sign in →' }}
      </BButton>
      <p class="b-caption">
        <NuxtLink to="/account/forgot">Forgotten your password?</NuxtLink>
        <span class="sep">·</span>
        Not a member yet? <NuxtLink to="/about#membership">Join →</NuxtLink>
      </p>
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
.sep {
  margin: 0 var(--space-2);
  color: var(--grey-ghost);
}
.b-caption a {
  color: var(--grey-fog);
}
.b-caption a:hover {
  color: var(--signal);
}
</style>
