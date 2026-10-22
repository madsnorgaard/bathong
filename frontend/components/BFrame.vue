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
    /**
     * Nuxt Image screen-keyed sizes ("xs:100vw md:33vw"). Screens are pinned
     * to the spec widths 480/960/1440/1920 in nuxt.config.
     */
    sizes?: string
  }>(),
  { alt: '', ratio: 'default', eager: false, sizes: 'xs:100vw md:100vw lg:100vw xl:100vw' },
)

/**
 * A 390px phone at 2x asks for 780px. The xs screen is 480, so a sizes spec
 * without a 390 key offers that phone nothing between the xs value at 1x and
 * at 2x (480w and 960w for 100vw), and the browser takes the larger one for
 * a 344px box (#185, #187). Every frame gets the 390 key for its xs value
 * unless the caller set one; the keys add candidates, they take none away.
 */
const phoneSizes = computed(() => {
  const spec = props.sizes
  if (/(^|\s)390:/.test(spec)) return spec
  const xs = /(^|\s)xs:(\S+)/.exec(spec)
  return xs ? `390:${xs[2]} ${spec}` : spec
})

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
      :sizes="phoneSizes"
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
  /* the slot is a paper panel wherever the frame stands: its label takes the
     paper plate's quiet text, not the ink page's (2.14:1 on paper-dim) */
  color: var(--grey-ink);
}
</style>
