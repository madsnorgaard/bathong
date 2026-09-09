<script setup lang="ts">
/**
 * Sticky nav on the ink ground: translucent ink with the system's 10px
 * backdrop blur, hairline below. Join is always present. At 840px the links
 * become a focus-trapped sheet (W7).
 */
const links = [
  { to: '/stories', label: 'Stories' },
  { to: '/walks', label: 'Walks' },
  { to: '/workshops', label: 'Workshops' },
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
// Join is the door: an account first, the plan from the desk.
const joinLink = computed(() => (isSignedIn.value ? '/account' : '/account/sign-up'))

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
  // The sheet owns the viewport while open: the page behind must not scroll.
  if (import.meta.client) document.documentElement.style.overflow = open ? 'hidden' : ''
})

// Rotating past the breakpoint hides the sheet by CSS; the state (and the
// scroll lock with it) must follow, or the page stays frozen.
let desktopQuery: MediaQueryList | null = null
const closeOnDesktop = () => {
  if (desktopQuery?.matches) sheetOpen.value = false
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  desktopQuery = window.matchMedia('(min-width: 841px)')
  desktopQuery.addEventListener('change', closeOnDesktop)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  desktopQuery?.removeEventListener('change', closeOnDesktop)
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <header class="nav">
    <div class="nav-inner">
      <Wordmark />
      <nav class="links b-kicker" aria-label="Main">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
      </nav>
      <BButton :to="joinLink" variant="ghost" size="sm" class="join">Join →</BButton>
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
      </nav>
      <!-- the doors stay in reach: pinned to the sheet's foot, never below the fold -->
      <div class="sheet-actions">
        <BButton :to="joinLink" variant="ghost" class="sheet-join">Join →</BButton>
        <NuxtLink :to="accountLink.to" class="sheet-account b-kicker">{{ accountLink.label }}</NuxtLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.nav {
  --nav-bar-h: 64px;
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
  .nav-inner {
    /* deterministic bar height so the sheet can own the rest exactly */
    height: var(--nav-bar-h);
    padding-top: 0;
    padding-bottom: 0;
  }
  .sheet {
    display: flex;
    flex-direction: column;
    /* the rest of the real viewport: dvh tracks the URL bar, vh is the
       fallback; safe-area keeps the foot clear of the home indicator */
    height: calc(100vh - var(--nav-bar-h));
    height: calc(100dvh - var(--nav-bar-h));
    overflow-y: auto; /* safety valve; the fluid rhythm below means it should never engage */
    overscroll-behavior: contain;
    padding: var(--space-4) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
    border-bottom: var(--hairline);
  }
  .sheet-links {
    display: flex;
    flex-direction: column;
    /* rhythm and type breathe with the viewport height, so every link and
       the actions row fit a portrait phone without scrolling */
    gap: clamp(8px, 1.8dvh, var(--space-4));
  }
  .sheet-links a {
    color: var(--paper);
    min-height: 44px;
    display: flex;
    align-items: center;
    font-size: clamp(1.15rem, 3.8dvh, 2rem);
  }
  .sheet-links a:hover,
  .sheet-links a.router-link-active {
    color: var(--signal);
  }
  .sheet-actions {
    margin-top: auto;
    padding-top: var(--space-4);
    border-top: var(--hairline);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }
  .sheet-actions :deep(.sheet-join) {
    color: var(--signal);
    border-color: var(--paper);
  }
  .sheet-account {
    color: var(--grey-fog);
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
  .sheet-account:hover,
  .sheet-account.router-link-active {
    color: var(--signal);
  }
}
</style>
