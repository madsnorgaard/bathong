<script setup lang="ts">
/**
 * The desk's own nav: mono kickers, 44px targets. Security arrives with
 * its page.
 */
defineProps<{ showJoin?: boolean }>()
</script>

<template>
  <nav class="account-nav b-kicker" aria-label="Account">
    <NuxtLink to="/account">Desk</NuxtLink>
    <NuxtLink to="/account/profile">Profile</NuxtLink>
    <NuxtLink v-if="showJoin" to="/account/join">Join</NuxtLink>
  </nav>
</template>

<style scoped>
.account-nav {
  display: flex;
  gap: var(--space-4);
  border-bottom: 1px solid var(--grey-line);
}
.account-nav a {
  color: var(--grey-ghost);
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
.account-nav a:hover,
.account-nav a.router-link-exact-active {
  color: var(--signal);
}
</style>
