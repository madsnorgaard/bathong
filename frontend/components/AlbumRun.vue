<script setup lang="ts">
/**
 * An album's photographs: the feed's stagger (wide/narrow alternating, the
 * narrow one dropped) but never cropped, the frame takes whatever shape the
 * photograph has. Hairline-framed on ink, every one carries the credit;
 * the file's alt text is its caption.
 */
interface MediaLike {
  id: string | number
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

defineProps<{
  images: MediaLike[]
  credit: string
}>()
</script>

<template>
  <div class="run">
    <figure
      v-for="(image, i) in images"
      :key="image.id"
      class="cell"
      :class="[i % 4 === 0 || i % 4 === 3 ? 'wide' : 'narrow', { dropped: i % 2 === 1 }]"
    >
      <NuxtPicture
        v-if="mediaSrc(image as never)"
        :src="mediaSrc(image as never)!"
        :alt="image.alt ?? ''"
        :width="image.width ?? undefined"
        :height="image.height ?? undefined"
        sizes="xs:100vw md:60vw lg:60vw xl:900px"
        format="avif,webp"
        :loading="i === 0 ? 'eager' : 'lazy'"
        :img-attrs="{ class: 'run-img' }"
      />
      <FrameCaption standalone :credit="credit" :index="frameIndex(i + 1, images.length)" />
      <p v-if="image.alt" class="b-caption note">{{ image.alt }}</p>
    </figure>
  </div>
</template>

<style scoped>
.run {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-5) var(--space-4);
  align-items: start;
}
.cell {
  margin: 0;
  display: flex;
  flex-direction: column;
}
.cell.wide {
  grid-column: span 7;
}
.cell.narrow {
  grid-column: span 5;
}
.cell.dropped {
  margin-top: var(--space-6);
}
.cell :deep(picture) {
  display: block;
}
/* the 2px ink frame is invisible on ink; hairline instead, and no crop */
.cell :deep(.run-img) {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--grey-line);
  border-bottom: 0;
}
.note {
  margin-top: var(--space-2);
  color: var(--grey-ghost);
}
@media (max-width: 840px) {
  .cell.wide,
  .cell.narrow {
    grid-column: span 12;
  }
  .cell.dropped {
    margin-top: 0;
  }
}
</style>
