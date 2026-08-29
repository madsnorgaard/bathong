<script setup lang="ts">
/**
 * The member's own page, edited by the member: portrait, city, bio, links,
 * contact choice, the roster switch. The editorial fields (name, number,
 * role) stay with editors. One form, one Save; the portrait saves on its
 * own the moment it is chosen. No profile yet (no membership yet): the door
 * to joining, honestly.
 */
import type { Person } from '~/types/payload-types'
import { paragraphsToLexical } from '~/utils/lexical'
import { richTextParagraphs } from '~/utils/richtext'

definePageMeta({ middleware: 'auth' })
useShareMeta({ title: 'Profile', description: 'Your page on Bathong.' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

const { user, authed, updateProfile, uploadPortrait, fetchMe } = useAuth()

const profileId = computed(() => {
  const p = user.value?.profile
  return typeof p === 'object' && p ? p.id : typeof p === 'number' ? p : null
})

const { data: loaded } = await useAsyncData(
  () => `profile-${profileId.value ?? 'none'}`,
  () => (profileId.value ? authed<Person>(`/api/people/${profileId.value}?depth=1`) : Promise.resolve(null)),
)
const person = ref<Person | null>(loaded.value ?? null)

const basedIn = ref(person.value?.basedIn ?? '')
const bio = ref(richTextParagraphs(person.value?.bio as never).join('\n\n'))
const instagram = ref(person.value?.instagram ?? '')
const website = ref(person.value?.website ?? '')
const contactEmail = ref(person.value?.contactEmail ?? '')
const showContact = ref(Boolean(person.value?.showContact))
const onRoster = ref(Boolean(person.value?.onRoster))

const portrait = computed(() =>
  person.value?.portrait && typeof person.value.portrait === 'object' ? person.value.portrait : null,
)
const hasPortrait = computed(() => Boolean(portrait.value))
// The switch shows a state the save can honour: without a portrait it reads
// off and stays out of the patch, whatever an editor set.
const rosterModel = computed({
  get: () => hasPortrait.value && onRoster.value,
  set: (v: boolean) => (onRoster.value = v),
})
const PORTRAIT_MAX_MB = 10

const saving = ref(false)
const saved = ref(false)
const errorMessage = ref('')
const uploading = ref(false)
const uploadPct = ref(0)
const portraitMessage = ref('')
const portraitError = ref('')

async function choosePortrait(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !person.value) return
  portraitMessage.value = ''
  portraitError.value = ''
  if (file.size > PORTRAIT_MAX_MB * 1024 * 1024) {
    portraitError.value = `Under ${PORTRAIT_MAX_MB} MB, please. Export a smaller JPEG and try again.`
    input.value = ''
    return
  }
  uploading.value = true
  uploadPct.value = 0
  try {
    const id = await uploadPortrait(file, `Portrait of ${person.value.name}`, (pct) => (uploadPct.value = pct))
    person.value = await updateProfile(person.value.id, { portrait: id })
    portraitMessage.value = 'Portrait saved.'
    await fetchMe()
  } catch (error) {
    portraitError.value = (error as Error).message
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function save() {
  if (saving.value || !person.value) return
  saving.value = true
  saved.value = false
  errorMessage.value = ''
  try {
    person.value = await updateProfile(person.value.id, {
      basedIn: basedIn.value.trim(),
      bio: paragraphsToLexical(bio.value),
      instagram: instagram.value.trim(),
      website: website.value.trim(),
      contactEmail: contactEmail.value.trim() || null,
      showContact: showContact.value,
      ...(hasPortrait.value ? { onRoster: onRoster.value } : {}),
    })
    instagram.value = person.value.instagram ?? ''
    onRoster.value = Boolean(person.value.onRoster)
    saved.value = true
    await fetchMe()
  } catch (error) {
    errorMessage.value = (error as Error).message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="chapter account-chapter">
    <ChapterHead title="Profile" />
    <AccountNav :show-join="!person" />

    <!-- no profile yet: it arrives with the membership -->
    <section v-if="!person" class="account-form">
      <p class="b-lede">Your profile arrives with your membership.</p>
      <p>When your first payment shows, your page is made with your member number on it. Then you fill it in here.</p>
      <BButton to="/account/join" variant="signal">Join →</BButton>
    </section>

    <template v-else>
      <!-- the portrait saves on its own -->
      <section class="account-form portrait-block">
        <p class="b-kicker">Portrait</p>
        <BFrame
          v-if="portrait"
          :src="mediaSrc(portrait as never)"
          :alt="portrait.alt || `Portrait of ${person.name}`"
          ratio="tall"
          sizes="xs:60vw md:20vw"
          class="portrait"
        />
        <div v-else class="portrait empty" aria-hidden="true" />
        <label for="portrait" class="b-label">{{ portrait ? 'Replace the portrait' : 'Add a portrait' }}</label>
        <input
          id="portrait"
          type="file"
          name="portrait"
          accept="image/jpeg,image/png,image/webp"
          class="b-field file"
          :disabled="uploading"
          @change="choosePortrait"
        >
        <p class="b-caption muted">JPEG, PNG or WebP under {{ PORTRAIT_MAX_MB }} MB. Tall or square reads best; it is cropped to 4:5.</p>
        <p v-if="uploading" class="b-caption" aria-live="polite">Uploading {{ uploadPct }}%</p>
        <p v-else-if="portraitMessage" class="b-caption ok" role="status">{{ portraitMessage }}</p>
        <p v-if="portraitError" class="b-caption error" role="alert">{{ portraitError }}</p>
      </section>

      <form class="account-form" novalidate @submit.prevent="save">
        <p class="b-caption muted">
          {{ person.name }}<template v-if="person.memberNumber"> · Member № {{ String(person.memberNumber).padStart(4, '0') }}</template>.
          Name and number are set by the collective; write to us for a change.
        </p>
        <BField v-model="basedIn" label="Based in" name="basedIn" placeholder="Pretoria" :maxlength="80" />
        <BField v-model="bio" label="Bio" name="bio" textarea :rows="6" :maxlength="1500" placeholder="Two or three lines. Who you are, what you photograph." />
        <BField v-model="instagram" label="Instagram" name="instagram" placeholder="@handle or the link" :maxlength="200" />
        <BField v-model="website" label="Website" name="website" type="url" placeholder="https://" :maxlength="200" />
        <BField v-model="contactEmail" label="Contact email" name="contactEmail" type="email" autocomplete="email" placeholder="Shown only if you choose to" />
        <label class="opt b-caption">
          <input v-model="showContact" type="checkbox" name="showContact">
          Show my contact on my page. Off, enquiries come to the collective address.
        </label>
        <label class="opt b-caption" :class="{ off: !hasPortrait }">
          <input v-model="rosterModel" type="checkbox" name="onRoster" :disabled="!hasPortrait">
          Show me on the roster<template v-if="!hasPortrait">. Add a portrait first.</template>
        </label>
        <p v-if="errorMessage" class="b-caption error" role="alert">{{ errorMessage }}</p>
        <p v-else-if="saved" class="b-caption ok" role="status">Saved.</p>
        <div class="actions">
          <BButton type="submit" variant="ghost" :disabled="saving">{{ saving ? 'Saving...' : 'Save →' }}</BButton>
          <NuxtLink v-if="person.onRoster && person.slug" :to="`/photographers/${person.slug}`" class="b-caption">Your public page →</NuxtLink>
        </div>
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
.portrait-block {
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--grey-line);
}
.portrait {
  width: 12rem;
  border: 1px solid var(--grey-line);
}
.portrait.empty {
  aspect-ratio: 4 / 5;
  border: 1px dashed var(--grey-line);
}
.file {
  padding: var(--space-2);
}
.opt {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  min-height: 44px;
  cursor: pointer;
}
.opt.off {
  color: var(--grey-ghost);
  cursor: default;
}
.opt input {
  accent-color: var(--jacaranda);
  width: 18px;
  height: 18px;
  flex: none;
  margin-top: 2px;
}
.actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.actions a {
  color: var(--grey-fog);
}
.actions a:hover {
  color: var(--signal);
}
.ok {
  color: var(--signal);
}
.error {
  color: var(--signal);
}
.muted {
  color: var(--grey-ghost);
}
</style>
