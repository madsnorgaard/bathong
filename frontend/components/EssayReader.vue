<script setup lang="ts">
/**
 * The sequencer (W2). Owns the 82vh cap (a photograph is seen whole or it is
 * not seen), the current-frame tracking for the counter rule, keyboard and
 * tap advance, and the streaming loader: frame 1 eager, the rest on
 * approach. Nothing autoplays, ever. Frames are never cropped: width follows
 * from height and ratio, and every frame holds its place before its file
 * arrives.
 */
interface MediaDoc {
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

interface FrameDoc {
  id: number
  image?: MediaDoc | number | null
  photographer?: { name?: string | null } | number | null
  creditOverride?: string | null
  caption?: string | null
  location?: string | null
}

interface FrameBlock {
  id?: string | null
  blockType: 'frame'
  frame?: FrameDoc | number | null
  captionOverride?: string | null
  fullBleed?: boolean | null
}
interface PairBlock {
  id?: string | null
  blockType: 'pair'
  left?: FrameDoc | number | null
  right?: FrameDoc | number | null
  captionOverride?: string | null
}
interface TextBlock {
  id?: string | null
  blockType: 'text'
  body?: unknown
}
// a union on blockType, so each branch below and in the template narrows
type SequenceBlock = FrameBlock | PairBlock | TextBlock

const props = defineProps<{ sequence: SequenceBlock[] }>()
const emit = defineEmits<{ progress: [current: number, total: number] }>()

// ---- renditions ----
/**
 * The reader writes its own picture element instead of using NuxtPicture.
 * A frame is as wide as the 82vh cap and its ratio allow, so the width it
 * is shown at depends on the height of the window and the shape of the
 * file. NuxtPicture's sizes takes one px or vw value per screen key and
 * cannot say that; the sizes attribute itself can (min() and vh). The
 * renditions still come from @nuxt/image, so every one is an /_ipx/ URL
 * over a relative source, one source per format.
 */
type Slot = 'bleed' | 'single' | 'pair'

interface FramePicture {
  avif: string
  webp: string
  /** JPEG, for the few browsers with neither format. */
  fallback: string
  sizes: string
  width?: number
  height?: number
  /** The custom properties the stylesheet sizes a known file from. */
  style?: Record<string, string>
}

interface RenderFrame {
  frame: FrameDoc
  index: number
  captionOverride?: string | null
  picture: FramePicture | null
}

/**
 * The rendition widths on offer, a step of 13 to 33 percent apart, so a
 * screen is sent the pixels it needs and few more. A file is offered up to
 * its own width and never past it: ipx does not enlarge, so a wider
 * candidate would be the same pixels under a larger label.
 */
const LADDER = [480, 640, 840, 960, 1120, 1280, 1440, 1680, 1920, 2400, 2880, 3840]

/**
 * A frame held by the 82vh cap asks for this much more than the width it is
 * shown at. A rendition matched to the pixel is resampled by the browser a
 * second time at almost 1:1 and loses fine texture: measured on a 1440x900
 * screen at 1107px shown, 1120px scored 34.3 dB against the original and
 * 1440px scored 37.7 dB, and the grain of the stone was visibly smoother.
 * 1.3 is what that screen was sent before, so nothing gets softer.
 */
const HEADROOM = 1.3

/**
 * The sizes attribute: the layout's own limit (the full width, half of it
 * for a pair, 1440px), the 82vh cap as a width with its headroom, and the
 * file's own pixels, whichever is least. A browser that cannot read min()
 * here falls back to 100vw: heavier, never softer.
 */
function slotSizes(slot: Slot, width?: number, height?: number): string {
  if (slot === 'bleed') return '100vw'
  const caps =
    width && height ? `, ${Math.ceil((8200 * HEADROOM * width) / height) / 100}vh, ${width}px` : ''
  if (slot === 'pair') return `(max-width: 840px) min(100vw${caps}), min(50vw${caps})`
  return `min(100vw, 1440px${caps})`
}

const img = useImage()

function framePicture(f: FrameDoc, slot: Slot): FramePicture | null {
  const src = mediaSrc(f.image as never)
  if (!src) return null
  const media = typeof f.image === 'object' ? f.image : null
  const width = media?.width || undefined
  const height = media?.height || undefined
  const quality = img.options.quality
  const widths = width ? [...LADDER.filter((w) => w < width), width] : LADDER
  const srcset = (format: string) =>
    widths.map((w) => `${img(src, { width: w, format, quality })} ${w}w`).join(', ')
  const picture: FramePicture = {
    avif: srcset('avif'),
    webp: srcset('webp'),
    fallback: img(src, { width: Math.min(1440, width ?? 1440), format: 'jpeg', quality }),
    sizes: slotSizes(slot, width, height),
  }
  if (width && height) {
    picture.width = width
    picture.height = height
    picture.style = { '--ratio': (width / height).toFixed(4), '--file-width': `${width}px` }
  }
  return picture
}

/** Flatten blocks into render data, numbering every frame (pairs count as two). */
const rendered = computed(() => {
  const frames: RenderFrame[] = []
  const numbered = (f: unknown, slot: Slot, captionOverride?: string | null): RenderFrame | null => {
    if (!f || typeof f !== 'object') return null
    const frame = f as FrameDoc
    const rf = { frame, index: frames.length + 1, captionOverride, picture: framePicture(frame, slot) }
    frames.push(rf)
    return rf
  }
  const blocks = props.sequence.map((block) => {
    if (block.blockType === 'frame') {
      const slot = block.fullBleed ? 'bleed' : 'single'
      return { ...block, single: numbered(block.frame, slot, block.captionOverride) }
    }
    if (block.blockType === 'pair') {
      return {
        ...block,
        pairLeft: numbered(block.left, 'pair', block.captionOverride),
        pairRight: numbered(block.right, 'pair'),
      }
    }
    return { ...block, paragraphs: richTextParagraphs(block.body as never) }
  })
  return { blocks, total: frames.length, first: frames[0]?.picture ?? null }
})

// Frame 1 is the page's largest paint: the head names it, so the fetch
// starts before the body is parsed. The type keeps a browser without AVIF
// from fetching a file it would not use.
if (import.meta.server) {
  useHead({
    link: () => {
      const first = rendered.value.first
      if (!first) return []
      return [
        {
          rel: 'preload',
          as: 'image',
          type: 'image/avif',
          imagesrcset: first.avif,
          imagesizes: first.sizes,
          fetchpriority: 'high',
        },
      ]
    },
  })
}

const total = computed(() => rendered.value.total)
const current = ref(1)
watch([current, total], () => emit('progress', current.value, total.value), { immediate: true })

function frameAlt(f: FrameDoc): string {
  return (typeof f.image === 'object' && f.image?.alt) || f.caption || ''
}
function capsule(rf: RenderFrame) {
  return {
    index: frameIndex(rf.index, total.value),
    place: rf.captionOverride ?? rf.frame.caption ?? rf.frame.location ?? undefined,
    credit: frameCredit(rf.frame),
  }
}

// ---- current-frame tracking + advance ----
const root = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function frameEls(): HTMLElement[] {
  return [...(root.value?.querySelectorAll<HTMLElement>('[data-frame-index]') ?? [])]
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) current.value = Number((visible.target as HTMLElement).dataset.frameIndex)
    },
    { threshold: [0.4, 0.6] },
  )
  frameEls().forEach((el) => observer!.observe(el))

  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('keydown', onKeydown)
})

function advance(direction: 1 | -1) {
  const els = frameEls()
  const target = els.find((el) => Number(el.dataset.frameIndex) === current.value + direction)
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
    e.preventDefault()
    advance(1)
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
    e.preventDefault()
    advance(-1)
  }
}
</script>

<template>
  <div ref="root" class="reader-flow">
    <template v-for="(block, i) in rendered.blocks" :key="block.id ?? i">
      <!-- single frame, whole in the viewport -->
      <figure
        v-if="block.blockType === 'frame' && block.single"
        class="frame-unit"
        :class="{ bleed: block.fullBleed }"
        :data-frame-index="block.single.index"
        @click="advance(1)"
      >
        <picture v-if="block.single.picture">
          <source type="image/avif" :srcset="block.single.picture.avif" :sizes="block.single.picture.sizes">
          <source type="image/webp" :srcset="block.single.picture.webp" :sizes="block.single.picture.sizes">
          <img
            :loading="block.single.index === 1 ? 'eager' : 'lazy'"
            :fetchpriority="block.single.index === 1 ? 'high' : undefined"
            :src="block.single.picture.fallback"
            :alt="frameAlt(block.single.frame)"
            :width="block.single.picture.width"
            :height="block.single.picture.height"
            :style="block.single.picture.style"
            class="frame-img"
          >
        </picture>
        <FrameCaption
          standalone
          :credit="capsule(block.single).credit"
          :index="capsule(block.single).index"
          :place="capsule(block.single).place"
          class="capsule"
        />
      </figure>

      <!-- paired frames where the edit pairs them -->
      <div v-else-if="block.blockType === 'pair'" class="pair-unit">
        <figure
          v-for="rf in [block.pairLeft, block.pairRight]"
          :key="rf?.index"
          class="pair-half"
          :data-frame-index="rf?.index"
          @click="advance(1)"
        >
          <picture v-if="rf?.picture">
            <source type="image/avif" :srcset="rf.picture.avif" :sizes="rf.picture.sizes">
            <source type="image/webp" :srcset="rf.picture.webp" :sizes="rf.picture.sizes">
            <img
              :loading="rf.index === 1 ? 'eager' : 'lazy'"
              :fetchpriority="rf.index === 1 ? 'high' : undefined"
              :src="rf.picture.fallback"
              :alt="frameAlt(rf.frame)"
              :width="rf.picture.width"
              :height="rf.picture.height"
              :style="rf.picture.style"
              class="frame-img"
            >
          </picture>
          <FrameCaption
            v-if="rf"
            standalone
            :credit="capsule(rf).credit"
            :index="capsule(rf).index"
            :place="capsule(rf).place"
            class="capsule"
          />
        </figure>
      </div>

      <!-- interleaved text, never front-loaded -->
      <div v-else-if="block.blockType === 'text'" class="text-unit">
        <p v-for="(para, j) in block.paragraphs" :key="j">{{ para }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.reader-flow {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-5) 0 var(--space-6);
}
/* the most important rule in the build: sized to fit the viewport height */
.frame-unit {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}
/* the picture element is only a wrapper: the image is the flex or grid child */
.frame-unit picture,
.pair-half picture {
  display: contents;
}
.frame-unit .frame-img {
  max-height: 82vh;
  max-width: min(100% - 2 * var(--space-4), 1440px);
  width: auto;
  height: auto;
  display: block;
}
/* A file that knows its size holds its place before it arrives: the width is
   spelled out from the 82vh cap and the file's ratio, never past the file's
   own pixels, and the height follows from the width and height attributes.
   A file without them is sized on arrival, as before. */
.frame-unit .frame-img[width],
.pair-half .frame-img[width] {
  width: min(82vh * var(--ratio), var(--file-width));
}
.frame-unit .capsule {
  width: auto;
  min-width: min(60ch, 90%);
}
/* full bleed is a device: edge to edge, caption below in the standard capsule */
.frame-unit.bleed .frame-img {
  max-height: none;
  max-width: 100%;
  width: 100vw;
}
.pair-unit {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  align-items: end;
  padding: 0 var(--space-4);
}
.pair-half {
  margin: 0;
  cursor: pointer;
}
.pair-half .frame-img {
  max-height: 82vh;
  max-width: 100%;
  width: auto;
  height: auto;
  display: block;
}
.text-unit {
  max-width: 62ch;
  margin: 0 auto;
  padding: 0 var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  color: var(--grey-fog);
  font-size: var(--text-lede);
}
@media (max-width: 840px) {
  .pair-unit {
    grid-template-columns: 1fr;
  }
  .frame-unit .frame-img {
    max-width: 100%;
  }
}
</style>
