<script setup lang="ts">
/**
 * Sticky nav (W1 annotation 1): paper at 88% with a 10px backdrop blur, the
 * only fixed element. Join is always present. At 840px the links become a
 * focus-trapped sheet (W7). Phase 1 carries the live pages only; the three
 * doors return as their sections come online.
 */
const links = [
  { to: '/walks', label: 'Walks' },
  { to: '/about', label: 'About' },
]

const sheetOpen = ref(false)
const sheetEl = ref<HTMLElement | null>(null)
const toggleEl = ref<HTMLElement | null>(null)
const route = useRoute()

watch(() => route.path, () => {
  sheetOpen.value = false
})

function onKeydown(e: KeyboardEvent) {
  if (!sheetOpen.value) return
  if (e.key === 'Escape') {
    sheetOpen.value = false
    toggleEl.value?.focus()
    return
  }
  if (e.key !== 'Tab' || !sheetEl.value) return
  const focusables = sheetEl.value.querySelectorAll<HTMLElement>('a, button')
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(sheetOpen, (open) => {
  if (open) nextTick(() => sheetEl.value?.querySelector<HTMLElement>('a, button')?.focus())
})

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="nav">
    <div class="nav-inner">
      <Wordmark />
      <nav class="links b-kicker" aria-label="Main">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
      </nav>
      <BButton to="/about#membership" size="sm" class="join">Join →</BButton>
      <button
        ref="toggleEl"
        class="sheet-toggle b-kicker"
        :aria-expanded="sheetOpen"
        aria-controls="sheet-menu"
        @click="sheetOpen = !sheetOpen"
      >
        {{ sheetOpen ? '✕' : '≡' }}<span class="sr-only"> menu</span>
      </button>
    </div>
    <div v-if="sheetOpen" id="sheet-menu" ref="sheetEl" class="sheet on-ink" role="dialog" aria-modal="true" aria-label="Menu">
      <nav class="sheet-links" aria-label="Main">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to" class="b-display-2">
          {{ link.label }}
        </NuxtLink>
        <NuxtLink to="/about#membership" class="b-display-2">Join →</NuxtLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: color-mix(in srgb, var(--paper) 88%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: var(--border-frame);
}
.nav-inner {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
}
.nav-inner :deep(.b-mark) {
  font-size: 1.5rem;
}
.links {
  display: flex;
  gap: var(--space-4);
  flex: 1;
}
.links a {
  color: inherit;
}
.links a:hover,
.links a.router-link-active {
  color: var(--jacaranda-deep);
}
.sheet-toggle {
  display: none;
  background: none;
  border: var(--border-frame);
  padding: 8px 14px;
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;
}
.sheet {
  display: none;
}
@media (max-width: 840px) {
  .links,
  .join {
    display: none;
  }
  .nav-inner {
    justify-content: space-between;
  }
  .sheet-toggle {
    display: block;
  }
  .sheet {
    display: flex;
    flex-direction: column;
    padding: var(--space-5) var(--space-4);
  }
  .sheet-links {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .sheet-links a {
    color: var(--paper);
    min-height: 44px;
    display: flex;
    align-items: center;
  }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
