/**
 * Route middleware for member-only pages: `definePageMeta({ middleware: 'auth' })`.
 * Anonymous visitors go to sign-in and come back to where they were.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchMe } = useAuth()
  if (!user.value) await fetchMe()
  if (!user.value) {
    return navigateTo({ path: '/account/sign-in', query: { next: to.fullPath } })
  }
})
