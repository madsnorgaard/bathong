<script setup lang="ts">
/**
 * A photograph in the 2px ink frame. contrast(1.05) and nothing else comes
 * from .b-frame in components.css. Flat --paper-dim placeholder, no blur-up.
 * Ratios: 3/2 default, 21/9 lead, 4/5 portrait, 1/1 social only.
 */
const props = withDefaults(
  defineProps<{
    src?: string | null
    alt?: string
    ratio?: 'default' | 'wide' | 'tall' | 'square'
    credit?: string
    captionIndex?: string
    place?: string
    time?: string
    /** Lead frames load eagerly; everything else is lazy. */
    eager?: boolean
    /** Responsive sizes hint, e.g. "(min-width: 960px) 33vw, 100vw" */
    sizes?: string
    /** Cap the source width requested for the largest breakpoint. */
    maxWidth?: number
  }>(),
  { alt: '', ratio: 'default', eager: false, sizes: '100vw', maxWidth: 1920 },
)

const ratioClass = computed(() => ({
  'b-frame--wide': props.ratio === 'wide',
  'b-frame--tall': props.ratio === 'tall',
  'b-frame--square': props.ratio === 'square',
}))
</script>

<template>
  <figure class="b-frame frame-holder" :class="ratioClass">
    <NuxtPicture
      v-if="src"
      :src="src"
      :alt="alt"
      :sizes="sizes"
      :width="maxWidth"
      format="avif,webp"
      :loading="eager ? 'eager' : 'lazy'"
      :preload="eager"
      :img-attrs="{ class: 'frame-img' }"
    />
    <div v-else class="photo-slot b-caption">PHOTO SLOT</div>
    <slot />
    <FrameCaption v-if="credit" :credit="credit" :index="captionIndex" :place="place" :time="time" />
  </figure>
</template>

<style scoped>
.frame-holder {
  background: var(--paper-dim); /* the honest placeholder: flat, no shimmer */
  margin: 0;
}
.frame-holder :deep(picture),
.frame-holder :deep(.frame-img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.photo-slot {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}
</style>
