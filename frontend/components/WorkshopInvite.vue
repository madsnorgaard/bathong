<script setup lang="ts">
/**
 * The designed invite for a workshop: shown as a card, opening the full
 * poster in its own tab. The poster is a made thing, not a photograph, so
 * it renders plain (no BFrame credit overlay; the invite carries its own).
 */
import type { Media } from '~/types/payload-types'

const props = defineProps<{ media: Media; title?: string }>()

const src = computed(() => mediaSrc(props.media as never))

// The full view opens through ipx too: the raw /api/media path does not
// exist on this origin. 2200 is the pipeline's largest step; ipx caps at
// the original, so the poster arrives whole.
const img = useImage()
const fullSrc = computed(() => (src.value ? img(src.value, { width: 2200, quality: 90 }) : null))
</script>

<template>
  <a v-if="src && fullSrc" :href="fullSrc" target="_blank" rel="noopener" class="invite">
    <NuxtPicture
      :src="src"
      :alt="media.alt ?? (title ? `Invite for ${title}` : 'Workshop invite')"
      sizes="xs:100vw md:60vw lg:50vw xl:640px"
      format="avif,webp"
      loading="lazy"
      :img-attrs="{ class: 'invite-img' }"
    />
    <span class="b-kicker open">Open the full invite →</span>
  </a>
</template>

<style scoped>
.invite {
  display: inline-flex;
  flex-direction: column;
  gap: var(--space-2);
  color: inherit;
  max-width: 640px;
}
.invite :deep(picture) {
  display: block;
}
.invite :deep(.invite-img) {
  display: block;
  max-width: 100%;
  height: auto;
  border: 1px solid var(--grey-line);
}
.open {
  color: var(--signal);
}
.invite:hover .open {
  text-decoration: underline;
}
</style>
