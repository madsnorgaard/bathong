<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const message = computed(() =>
  props.error.statusCode === 404
    ? 'This frame does not exist. Or not yet.'
    : 'Something broke in the darkroom.',
)
</script>

<template>
  <div class="err on-ink grain">
    <p class="b-kicker">{{ error.statusCode }}</p>
    <h1 class="b-mark b-mark--hero">Bathong<span class="dot">.</span></h1>
    <p class="b-lede">{{ message }}</p>
    <BButton variant="ghost" @click="clearError({ redirect: '/' })">Back to the light →</BButton>
  </div>
</template>

<style scoped>
.err {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-6) var(--space-4);
}
</style>
