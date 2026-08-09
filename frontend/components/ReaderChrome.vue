<script setup lang="ts">
/**
 * Reader chrome, not site chrome (W2): a wordmark, a frame counter that
 * doubles as the 2px progress rule (signal on ink), and a close control.
 * Everything else gets out of the way.
 */
const props = defineProps<{
  current: number
  total: number
  closeTo?: string
}>()

const progress = computed(() =>
  props.total > 0 ? Math.min(100, (props.current / props.total) * 100) : 0,
)
</script>

<template>
  <header class="chrome">
    <div class="chrome-bar">
      <Wordmark class="mark" />
      <span class="counter" aria-live="polite">{{ frameIndex(current, total) }}</span>
      <NuxtLink :to="closeTo ?? '/stories'" class="close b-kicker" aria-label="Close the essay">
        ✕ <span class="close-word">close</span>
      </NuxtLink>
    </div>
    <div class="rule" role="progressbar" :aria-valuenow="current" :aria-valuemin="1" :aria-valuemax="total" aria-label="Frame progress">
      <div class="rule-fill" :style="{ width: `${progress}%` }" />
    </div>
  </header>
</template>

<style scoped>
.chrome {
  position: sticky;
  top: 0;
  z-index: 100;
  background: color-mix(in srgb, var(--ink) 88%, transparent);
  backdrop-filter: blur(10px);
}
.chrome-bar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  min-height: 44px;
}
.mark:deep(),
.chrome-bar :deep(.b-mark) {
  font-size: 1.1rem;
  color: var(--paper);
}
.counter {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: var(--track-label);
  color: var(--grey-ghost);
  flex: 1;
}
.close {
  color: var(--grey-ghost);
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
}
.close:hover {
  color: var(--signal);
}
@media (max-width: 840px) {
  .close-word {
    display: none;
  }
}
/* the counter is a rule: 2px, signal on ink */
.rule {
  height: 2px;
  background: var(--grey-line);
}
.rule-fill {
  height: 100%;
  background: var(--signal);
  transition: width 0.18s ease;
}
</style>
