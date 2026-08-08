// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      // Optional props are typed; an explicit undefined default adds nothing.
      'vue/require-default-prop': 'off',
      // Design-system primitives keep their canonical names (Wordmark, ...).
      'vue/multi-word-component-names': ['error', { ignores: ['Wordmark'] }],
    },
  },
  {
    // Nuxt layout/page/error filenames are single words by convention.
    files: ['layouts/**', 'pages/**', 'error.vue', 'app.vue'],
    rules: { 'vue/multi-word-component-names': 'off' },
  },
)
