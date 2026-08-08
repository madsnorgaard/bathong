<script setup lang="ts">
/**
 * Reader layout stub for the Phase 2 essay reader. Ink is the reading ground
 * (decided); everything themed through the semantic aliases so the reader
 * inherits the system without new tokens. Reader chrome (wordmark, frame
 * counter, close) arrives with the EssayReader component.
 */
</script>

<template>
  <div class="reader on-ink">
    <slot />
  </div>
</template>

<style scoped>
.reader {
  min-height: 100vh;
  background: var(--surface-dark);
  color: var(--text-on-dark);
}
</style>
