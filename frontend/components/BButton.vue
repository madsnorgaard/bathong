<script setup lang="ts">
/**
 * The one button in the system. Reserve variant="signal" for the membership
 * CTA. On ink surfaces use "ghost". Labels are short and imperative, often
 * ending in an arrow.
 */
const props = withDefaults(
  defineProps<{
    to?: string
    href?: string
    variant?: 'ink' | 'signal' | 'ghost'
    size?: 'md' | 'sm'
    type?: 'button' | 'submit'
    disabled?: boolean
  }>(),
  { variant: 'ink', size: 'md', type: 'button' },
)

const classes = computed(() => [
  'b-btn',
  props.variant === 'signal' && 'b-btn--signal',
  props.variant === 'ghost' && 'b-btn--ghost',
  props.size === 'sm' && 'b-btn--sm',
])
</script>

<template>
  <NuxtLink v-if="to" :to="to" :class="classes" :aria-disabled="disabled || undefined">
    <slot />
  </NuxtLink>
  <a v-else-if="href" :href="href" :class="classes" :aria-disabled="disabled || undefined">
    <slot />
  </a>
  <button v-else :type="type" :class="classes" :disabled="disabled">
    <slot />
  </button>
</template>
