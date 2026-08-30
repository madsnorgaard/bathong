<script setup lang="ts">
/**
 * Make an account (anyone can join). One form, then one instruction: check
 * your inbox. The success state is the same whether the address was new or
 * already known, so the page never tells a stranger who is a member.
 */
import { passwordProblem } from '~/utils/password'

useShareMeta({ title: 'Make an account', description: 'Make a free Bathong. account. Membership comes after.' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

const { user, signUp } = useAuth()
if (user.value) await navigateTo('/account', { replace: true })

const name = ref('')
const email = ref('')
const password = ref('')
const newsletter = ref(false)
const website = ref('') // honeypot; humans never see or fill it
const pending = ref(false)
const done = ref(false)
const errorMessage = ref('')

const passwordError = computed(() =>
  password.value ? passwordProblem(password.value, email.value) : null,
)
const canSend = computed(
  () => Boolean(name.value.trim() && email.value.trim() && password.value) && !passwordError.value && !pending.value,
)

async function submit() {
  if (!canSend.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    await signUp({
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
      newsletter: newsletter.value,
      website: website.value,
    })
    done.value = true
  } catch (error) {
    errorMessage.value = (error as Error).message
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="chapter account-chapter">
    <ChapterHead title="Make an account" />

    <div v-if="done" class="account-form state">
      <p class="b-lede">Check your inbox.</p>
      <p>We sent a link to {{ email.trim() }}. Open it to confirm the address, then sign in.</p>
      <p class="b-caption muted">Nothing arrived? Look in junk, or send it again.</p>
      <ResendVerification :email="email.trim()" />
    </div>

    <form v-else class="account-form" novalidate @submit.prevent="submit">
      <p class="lede">An account is free. Membership comes after, when you choose a plan.</p>
      <BField v-model="name" label="Name" name="name" required autocomplete="name" />
      <BField v-model="email" label="Email" name="email" type="email" required autocomplete="email" />
      <BField
        v-model="password"
        label="Password"
        name="password"
        type="password"
        required
        autocomplete="new-password"
        :error="passwordError ?? undefined"
      />
      <label class="opt b-caption">
        <input v-model="newsletter" type="checkbox" name="newsletter">
        Email me now and then about walks and calls
      </label>
      <div class="hp" aria-hidden="true">
        <label for="signup-website">Website</label>
        <input id="signup-website" v-model="website" type="text" name="website" tabindex="-1" autocomplete="off">
      </div>
      <p v-if="errorMessage" class="b-caption error" role="alert">{{ errorMessage }}</p>
      <BButton type="submit" variant="ghost" :disabled="!canSend">
        {{ pending ? 'Making it...' : 'Make my account →' }}
      </BButton>
      <p class="b-caption muted">
        We keep your name and email to run your account.
        <NuxtLink to="/privacy">Read the privacy notice →</NuxtLink>
      </p>
      <p class="b-caption">
        Already have one? <NuxtLink to="/account/sign-in">Sign in →</NuxtLink>
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
.lede {
  color: var(--grey-fog);
}
.state {
  border: 1px solid var(--grey-line);
  padding: var(--space-4);
}
.opt {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  cursor: pointer;
}
.opt input {
  width: 18px;
  height: 18px;
  accent-color: var(--jacaranda);
}
.hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
.error {
  color: var(--signal);
}
.muted {
  color: var(--grey-ghost);
}
.b-caption a {
  color: var(--grey-fog);
}
.b-caption a:hover {
  color: var(--signal);
}
</style>
