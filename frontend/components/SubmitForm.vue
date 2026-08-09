<script setup lang="ts">
/**
 * The photocall entry form (W6): on the same screen as the brief, multi-file
 * drop built from the field primitives, an upload state with a progress
 * rule, and a written confirmation. Posts to the hardened
 * /api/photocall-entries endpoint (honeypot, sniffing, caps server-side).
 */
const props = defineProps<{
  photocallId: number | string
  maxFrames: number
  termsParagraphs: string[]
}>()

const name = ref('')
const email = ref('')
const whereYouShoot = ref('')
const website = ref('') // honeypot
const agreed = ref(false)
const files = ref<File[]>([])
const dragOver = ref(false)
const uploading = ref(false)
const uploadPct = ref(0)
const done = ref(false)
const errorMessage = ref('')

const { public: { cmsUrl } } = useRuntimeConfig()

const MAX_FILE_BYTES = 20 * 1024 * 1024

function addFiles(list: FileList | null) {
  if (!list) return
  errorMessage.value = ''
  const incoming = [...list].filter((f) => f.type.startsWith('image/'))
  if (incoming.length !== list.length) {
    errorMessage.value = 'Frames must be photographs: JPEG, PNG, WebP, TIFF or AVIF.'
  }
  for (const file of incoming) {
    if (file.size > MAX_FILE_BYTES) {
      errorMessage.value = 'Each frame must be under 20 MB.'
      continue
    }
    if (files.value.length >= props.maxFrames) {
      errorMessage.value = `This call takes up to ${props.maxFrames} frames.`
      break
    }
    files.value.push(file)
  }
}

function removeFile(i: number) {
  files.value.splice(i, 1)
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  addFiles(e.dataTransfer?.files ?? null)
}

const canSend = computed(
  () => Boolean(name.value && email.value && agreed.value && files.value.length) && !uploading.value,
)

function submit() {
  if (!canSend.value) return
  uploading.value = true
  uploadPct.value = 0
  errorMessage.value = ''

  const form = new FormData()
  form.set('photocall', String(props.photocallId))
  form.set('name', name.value)
  form.set('email', email.value)
  form.set('whereYouShoot', whereYouShoot.value)
  form.set('agreedToTerms', 'true')
  if (website.value) form.set('website', website.value)
  for (const file of files.value) form.append('frames', file)

  // XHR for real upload progress driving the rule
  const xhr = new XMLHttpRequest()
  xhr.open('POST', `${cmsUrl.replace(/\/$/, '')}/api/photocall-entries`)
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) uploadPct.value = Math.round((e.loaded / e.total) * 100)
  }
  xhr.onload = () => {
    uploading.value = false
    if (xhr.status === 201) {
      done.value = true
      return
    }
    try {
      errorMessage.value =
        JSON.parse(xhr.responseText)?.errors?.[0]?.message ?? 'Something went wrong. Try again.'
    } catch {
      errorMessage.value = 'Something went wrong. Try again.'
    }
  }
  xhr.onerror = () => {
    uploading.value = false
    errorMessage.value = 'The upload did not go through. Check your connection and try again.'
  }
  xhr.send(form)
}
</script>

<template>
  <div class="submit">
    <div v-if="done" class="state">
      <p class="b-lede">In. {{ files.length }} frame{{ files.length === 1 ? '' : 's' }} received.</p>
      <p>
        Every entrant gets a written response, frame by frame, once the call closes. Selected work
        is published with your name on it. You keep your copyright. Always.
      </p>
    </div>

    <form v-else novalidate @submit.prevent="submit">
      <div class="fields">
        <BField v-model="name" label="Name" name="name" required autocomplete="name" />
        <BField v-model="email" label="Email" name="email" type="email" required autocomplete="email" />
      </div>
      <BField v-model="whereYouShoot" label="Where you shoot" name="whereYouShoot" placeholder="Mamelodi, the inner city, ..." />

      <div
        class="drop"
        :class="{ over: dragOver }"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
      >
        <label for="frames" class="b-label">Drop up to {{ maxFrames }} frames</label>
        <input
          id="frames"
          type="file"
          name="frames"
          accept="image/jpeg,image/png,image/webp,image/tiff,image/avif"
          multiple
          class="file-input"
          @change="addFiles(($event.target as HTMLInputElement).files)"
        >
        <ul v-if="files.length" class="file-list">
          <li v-for="(file, i) in files" :key="`${file.name}-${i}`" class="b-caption">
            {{ String(i + 1).padStart(2, '0') }} · {{ file.name }} ·
            {{ (file.size / 1024 / 1024).toFixed(1) }} MB
            <button type="button" class="remove b-caption" @click="removeFile(i)">✕ remove</button>
          </li>
        </ul>
      </div>

      <details class="terms">
        <summary class="b-caption">The terms, in writing</summary>
        <p v-for="(para, i) in termsParagraphs" :key="i" class="b-caption terms-text">{{ para }}</p>
      </details>
      <label class="agree b-caption">
        <input v-model="agreed" type="checkbox" name="agreedToTerms" required>
        I agree to the photocall terms. I keep my copyright.
      </label>

      <div class="hp" aria-hidden="true">
        <label for="entry-website">Website</label>
        <input id="entry-website" v-model="website" type="text" tabindex="-1" autocomplete="off">
      </div>

      <p v-if="errorMessage" class="b-caption error" role="alert">{{ errorMessage }}</p>

      <div v-if="uploading" class="progress" role="progressbar" :aria-valuenow="uploadPct" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-fill" :style="{ width: `${uploadPct}%` }" />
      </div>

      <BButton type="submit" :disabled="!canSend">
        {{ uploading ? `Sending ${uploadPct}%` : 'Send it - Bathong! →' }}
      </BButton>
      <p class="b-caption popia">
        Your name, email and frames are stored to run this call, visible to the editorial team
        only until published with your credit, and deleted on request.
      </p>
    </form>
  </div>
</template>

<style scoped>
.submit form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 40rem;
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
.drop {
  border: 1px dashed var(--grey-ghost);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.drop.over {
  border-color: var(--signal);
}
.file-input {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--grey-fog);
  min-height: 44px;
}
.file-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.remove {
  background: none;
  border: 0;
  color: var(--signal);
  cursor: pointer;
  margin-left: var(--space-2);
  min-height: 44px;
}
.terms summary {
  cursor: pointer;
  color: var(--grey-ghost);
  min-height: 44px;
  display: flex;
  align-items: center;
}
.terms-text {
  margin-top: var(--space-2);
  max-width: 62ch;
}
.agree {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  min-height: 44px;
  cursor: pointer;
}
.agree input {
  width: 20px;
  height: 20px;
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
/* the upload state is a rule, like the reader's counter */
.progress {
  height: 2px;
  background: var(--grey-line);
}
.progress-fill {
  height: 100%;
  background: var(--signal);
  transition: width 0.18s ease;
}
.state {
  border: 1px solid var(--grey-line);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 62ch;
}
.popia {
  max-width: 52ch;
}
</style>
