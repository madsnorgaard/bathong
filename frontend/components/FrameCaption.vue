<script setup lang="ts">
/**
 * The caption capsule: index / place / time on the left, © credit on the
 * right. Mono, opaque bar, hard edge. Never a gradient, never over the image.
 * Standalone so it also works under full-bleed frames (reader, Phase 2).
 */
const props = defineProps<{
  credit: string
  index?: string
  place?: string
  time?: string
  /** true renders it in flow (below a full-bleed frame) instead of absolutely inside a .b-frame */
  standalone?: boolean
}>()

const left = computed(() => [props.index, props.place, props.time].filter(Boolean).join(' · '))
</script>

<template>
  <figcaption class="caption" :class="{ standalone }">
    <span v-if="left">{{ left }}</span>
    <span v-else />
    <span class="b-credit">{{ credit }}</span>
  </figcaption>
</template>

<style scoped>
/* .caption inside .b-frame is styled by components.css; the standalone
   variant reproduces the same capsule in normal flow. */
.standalone {
  position: static;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  font-family: var(--font-mono);
  font-size: var(--text-micro);
  text-transform: uppercase;
  letter-spacing: var(--track-label);
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  border-top: var(--border-frame);
  color: var(--ink);
}
</style>
