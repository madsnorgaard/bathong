<script setup lang="ts">
/**
 * Inline RSVP form (W5). Posts to the public rsvps endpoint; the backend
 * enforces honeypot, duplicates and capacity (waitlist overflow). No email
 * confirmation until SMTP lands (#15), so the success copy stays honest.
 */
const props = defineProps<{ walkId: number | string }>()

const name = ref('')
const email = ref('')
const note = ref('')
const website = ref('') // honeypot; humans never see or fill it
const pending = ref(false)
const result = ref<'confirmed' | 'waitlist' | null>(null)
const errorMessage = ref('')

const { cms } = useCms()

async function submit() {
  if (pending.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    const response = await cms<{ doc?: { status?: string } }>('/api/rsvps', {
      method: 'POST',
      body: {
        walk: props.walkId,
        name: name.value,
        email: email.value,
        note: note.value || undefined,
        website: website.value || undefined,
      },
    })
    result.value = response?.doc?.status === 'waitlist' ? 'waitlist' : 'confirmed'
  } catch (error) {
    const data = (error as { data?: { errors?: { message?: string }[] } }).data
    errorMessage.value =
      data?.errors?.[0]?.message ?? 'Something went wrong. Try again, or write to us.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="rsvp">
    <p v-if="result === 'confirmed'" class="state b-lede">
      You're on the list. Bring one lens. Written confirmation lands once our mail is wired: TBC.
    </p>
    <p v-else-if="result === 'waitlist'" class="state b-lede">
      The walk is full, and you're on the waitlist. We'll be in touch if a place opens.
    </p>
    <form v-else novalidate @submit.prevent="submit">
      <div class="fields">
        <BField v-model="name" label="Name" name="name" required autocomplete="name" />
        <BField v-model="email" label="Email" name="email" type="email" required autocomplete="email" />
      </div>
      <BField v-model="note" label="Anything we should know" name="note" textarea />
      <div class="hp" aria-hidden="true">
        <label for="rsvp-website">Website</label>
        <input id="rsvp-website" v-model="website" type="text" name="website" tabindex="-1" autocomplete="off">
      </div>
      <p v-if="errorMessage" class="b-caption error" role="alert">{{ errorMessage }}</p>
      <BButton type="submit" :disabled="pending || !name || !email">
        {{ pending ? 'Sending...' : 'Reserve a place →' }}
      </BButton>
      <p class="b-caption popia">
        Your name and email are stored only to run this walk, visible to the editorial team only,
        and deleted on request.
      </p>
    </form>
  </div>
</template>

<style scoped>
.rsvp form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 34rem;
}
.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
@media (max-width: 840px) {
  .fields {
    grid-template-columns: 1fr;
  }
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
.state {
  border: 1px solid var(--grey-line);
  padding: var(--space-4);
}
.popia {
  max-width: 48ch;
}
</style>
