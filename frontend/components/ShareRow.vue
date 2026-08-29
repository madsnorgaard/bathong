<script setup lang="ts">
/**
 * The share row: a word and three typographic links, no icon set, in the
 * mono furniture. WhatsApp and mail are plain anchors so the row works
 * without JavaScript; "Copy link" only appears once the clipboard API is
 * known to exist. The URL is the canonical one from the configured site
 * origin, never the request host, so a share from staging still points home.
 */
const props = withDefaults(
  defineProps<{
    /** What is being shared, e.g. the essay title. Goes into the message. */
    title: string
    /** Path to share; defaults to the current route. */
    path?: string
    label?: string
  }>(),
  { label: 'Share' },
)

const config = useRuntimeConfig()
const route = useRoute()

const url = computed(() => canonicalUrl(config.public.siteUrl, props.path ?? route.path))
const links = computed(() => shareLinks(props.title, url.value))

const canCopy = ref(false)
const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  canCopy.value = typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.writeText)
})
onBeforeUnmount(() => clearTimeout(resetTimer))

async function copy() {
  try {
    await navigator.clipboard.writeText(url.value)
    copied.value = true
    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => (copied.value = false), 2000)
  } catch {
    canCopy.value = false
  }
}
</script>

<template>
  <nav class="share-row b-kicker" :aria-label="label">
    <span class="share-label">{{ label }}</span>
    <a :href="links.whatsapp" target="_blank" rel="noopener noreferrer">WhatsApp →</a>
    <a :href="links.email">Email →</a>
    <button v-if="canCopy" type="button" class="share-copy" @click="copy">
      {{ copied ? 'Copied.' : 'Copy link →' }}
    </button>
    <span class="sr-only" role="status" aria-live="polite">{{ copied ? 'Link copied.' : '' }}</span>
  </nav>
</template>

<style scoped>
.share-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3) var(--space-4);
  color: inherit;
}
.share-label {
  opacity: 0.6;
}
.share-row a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
.share-copy {
  background: none;
  border: 0;
  padding: 0;
  min-height: 44px;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: inherit;
  cursor: pointer;
  transition: color 0.18s ease;
}
/* the copy control follows whatever the plate does for links */
.on-ink .share-copy:hover,
.on-ink .share-copy:focus-visible {
  color: var(--signal);
}
.chapter--paper .share-copy:hover,
.chapter--paper .share-copy:focus-visible {
  color: var(--jacaranda-deep);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
