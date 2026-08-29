<script setup lang="ts">
/**
 * Sticky nav on the ink ground: translucent ink with the system's 10px
 * backdrop blur, hairline below. Join is always present. At 840px the links
 * become a focus-trapped sheet (W7).
 */
const links = [
  { to: '/stories', label: 'Stories' },
  { to: '/walks', label: 'Walks' },
  { to: '/albums', label: 'Albums' },
  { to: '/photocalls', label: 'Photocalls' },
  { to: '/archive', label: 'Archive' },
  { to: '/about', label: 'About' },
]

// Sign in / Account sits beside Join: read from the shared session state
// (fetched once in app.vue), so SSR and client render the same link.
const { isSignedIn } = useAuth()
const accountLink = computed(() =>
  isSignedIn.value ? { to: '/account', label: 'Account →' } : { to: '/account/sign-in', label: 'Sign in →' },
)

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
      <BButton to="/about#membership" variant="ghost" size="sm" class="join">Join →</BButton>
      <NuxtLink :to="accountLink.to" class="account b-kicker">{{ accountLink.label }}</NuxtLink>
      <button
        ref="toggleEl"
        class="sheet-toggle b-btn b-btn--ghost b-btn--sm"
        :aria-expanded="sheetOpen"
        aria-controls="sheet-menu"
        @click="sheetOpen = !sheetOpen"
      >
        {{ sheetOpen ? 'Close ✕' : 'Menu ≡' }}
      </button>
    </div>
    <div v-if="sheetOpen" id="sheet-menu" ref="sheetEl" class="sheet" role="dialog" aria-modal="true" aria-label="Menu">
      <nav class="sheet-links" aria-label="Main">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to" class="b-display-2">
          {{ link.label }}
        </NuxtLink>
        <NuxtLink to="/about#membership" class="b-display-2">Join →</NuxtLink>
        <NuxtLink :to="accountLink.to" class="b-display-2">{{ accountLink.label }}</NuxtLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: color-mix(in srgb, var(--ink) 88%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: var(--hairline);
}
.nav-inner {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
}
.nav-inner :deep(.b-mark) {
  font-size: 1.5rem;
  color: var(--paper);
}
.links {
  display: flex;
  gap: var(--space-4);
  flex: 1;
}
.links a {
  color: var(--grey-fog);
}
.links a:hover,
.links a.router-link-active {
  color: var(--signal);
}
.account {
  color: var(--grey-fog);
}
.account:hover,
.account.router-link-active {
  color: var(--signal);
}
/* same plate as Join: signal label, paper border, on ink */
.sheet-toggle {
  display: none;
  color: var(--signal);
  border-color: var(--paper);
}
.sheet-toggle:hover {
  background: var(--paper);
  color: var(--ink);
}
.sheet {
  display: none;
}
@media (max-width: 840px) {
  .links,
  .join,
  .account {
    display: none;
  }
  .nav-inner {
    justify-content: space-between;
  }
  .sheet-toggle {
    display: inline-flex;
  }
  .sheet {
    display: flex;
    flex-direction: column;
    padding: var(--space-5) var(--space-4);
    border-bottom: var(--hairline);
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
</style>
