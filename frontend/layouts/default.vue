<template>
  <div class="site on-ink grain">
    <SiteNav />
    <main>
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
/* The darkroom is the site: ink is the page ground, paper and jacaranda
   appear as deliberate full-bleed chapters. */
.site {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-dark);
  color: var(--text-on-dark);
}
main {
  flex: 1;
}
</style>
