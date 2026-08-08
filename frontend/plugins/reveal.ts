/**
 * v-reveal: adds .in when the element enters the viewport. The .reveal class
 * in components.css does the rest (.6s ease, 26px rise) and collapses under
 * prefers-reduced-motion. The only scroll JS in the site.
 */
export default defineNuxtPlugin((nuxtApp) => {
  let observer: IntersectionObserver | null = null

  const observe = (el: Element) => {
    observer ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            observer?.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(el)
  }

  nuxtApp.vueApp.directive('reveal', {
    mounted(el: HTMLElement) {
      el.classList.add('reveal')
      observe(el)
    },
    getSSRProps() {
      return {}
    },
  })
})
