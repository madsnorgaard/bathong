<script setup lang="ts">
/** Mono status chip. Status is a word, not a symbol. */
withDefaults(defineProps<{ variant?: 'signal' | 'ink' | 'outline' }>(), { variant: 'signal' })
</script>

<template>
  <span
    class="b-tag"
    :class="{ 'b-tag--ink': variant === 'ink', 'b-tag--outline': variant === 'outline' }"
  >
    <slot />
  </span>
</template>
