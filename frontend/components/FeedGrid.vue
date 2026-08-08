<script setup lang="ts">
/**
 * The feed: six recent single frames with credit (W1 annotation 6).
 * The site's pulse between essays. Never crops to fill: frames keep 3/2.
 */
interface FrameDoc {
  id: string | number
  image?: { url?: string | null; alt?: string | null } | string | null
  photographer?: { name?: string | null } | string | null
  creditOverride?: string | null
  caption?: string | null
  location?: string | null
}

defineProps<{ frames: FrameDoc[] }>()
const { public: { cmsUrl } } = useRuntimeConfig()
</script>

<template>
  <div class="feed">
    <BFrame
      v-for="frame in frames.slice(0, 6)"
      :key="frame.id"
      :src="mediaUrl(frame.image as never, cmsUrl)"
      :alt="typeof frame.image === 'object' && frame.image?.alt ? frame.image.alt : (frame.caption ?? '')"
      :credit="frameCredit(frame)"
      :place="frame.location ?? undefined"
      sizes="xs:50vw md:33vw"
    />
  </div>
</template>

<style scoped>
.feed {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
@media (max-width: 840px) {
  .feed {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
