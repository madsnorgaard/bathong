<script setup lang="ts">
/**
 * The sequencer (W2). Owns the 82vh cap (a photograph is seen whole or it is
 * not seen), the current-frame tracking for the counter rule, keyboard and
 * tap advance, and the streaming loader: frame 1 eager, frames 2-3 on idle,
 * the rest on approach. Nothing autoplays, ever. Frames are never cropped:
 * width follows from height and ratio.
 */
interface FrameDoc {
  id: number
  image?: { url?: string | null; alt?: string | null } | number | null
  photographer?: { name?: string | null } | number | null
  creditOverride?: string | null
  caption?: string | null
  location?: string | null
}

interface SequenceBlock {
  id?: string | null
  blockType: 'frame' | 'pair' | 'text'
  frame?: FrameDoc | number | null
  left?: FrameDoc | number | null
  right?: FrameDoc | number | null
  captionOverride?: string | null
  fullBleed?: boolean | null
  body?: unknown
}

const props = defineProps<{ sequence: SequenceBlock[] }>()
const emit = defineEmits<{ progress: [current: number, total: number] }>()

const { public: { cmsUrl } } = useRuntimeConfig()

interface RenderFrame {
  frame: FrameDoc
  index: number
  captionOverride?: string | null
}

/** Flatten blocks into render data, numbering every frame (pairs count as two). */
const rendered = computed(() => {
  let n = 0
  const numbered = (f: unknown, captionOverride?: string | null): RenderFrame | null => {
    if (!f || typeof f !== 'object') return null
    n += 1
    return { frame: f as FrameDoc, index: n, captionOverride }
  }
  const blocks = props.sequence.map((block) => {
    if (block.blockType === 'frame') {
      return { ...block, single: numbered(block.frame, block.captionOverride) }
    }
    if (block.blockType === 'pair') {
      return {
        ...block,
        pairLeft: numbered(block.left, block.captionOverride),
        pairRight: numbered(block.right),
      }
    }
    return { ...block, paragraphs: richTextParagraphs(block.body as never) }
  })
  return { blocks, total: n }
})

const total = computed(() => rendered.value.total)
const current = ref(1)
watch([current, total], () => emit('progress', current.value, total.value), { immediate: true })

function frameSrc(f: FrameDoc): string | null {
  return mediaUrl(f.image as never, cmsUrl)
}
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

  // streaming: frames 2-3 fetch on idle, ahead of the scroll
  const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500))
  idle(() => {
    for (const el of frameEls().slice(1, 3)) {
      const img = el.querySelector('img')
      if (img?.loading === 'lazy') img.loading = 'eager'
    }
  })

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
        <NuxtImg
          v-if="frameSrc(block.single.frame)"
          :src="frameSrc(block.single.frame)!"
          :alt="frameAlt(block.single.frame)"
          sizes="xs:100vw md:100vw lg:100vw xl:1440px"
          format="avif,webp"
          :loading="block.single.index === 1 ? 'eager' : 'lazy'"
          :preload="block.single.index === 1"
          class="frame-img"
        />
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
          <NuxtImg
            v-if="rf && frameSrc(rf.frame)"
            :src="frameSrc(rf.frame)!"
            :alt="frameAlt(rf.frame)"
            sizes="xs:100vw md:50vw"
            format="avif,webp"
            loading="lazy"
            class="frame-img"
          />
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
.frame-unit .frame-img {
  max-height: 82vh;
  max-width: min(100% - 2 * var(--space-4), 1440px);
  width: auto;
  height: auto;
  display: block;
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
