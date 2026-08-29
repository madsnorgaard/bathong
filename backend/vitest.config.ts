import { defineConfig } from 'vitest/config'

// Pure helpers only (src/lib, src/email/templates): no Payload boot, no DB.
export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
  },
})
