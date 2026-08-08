<template>
  <div class="site grain">
    <SiteNav />
    <main>
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.site {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
main {
  flex: 1;
}
</style>
