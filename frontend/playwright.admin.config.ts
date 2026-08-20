import { defineConfig } from '@playwright/test'

/**
 * Admin-panel specs only (Payload on 3001). Unlike the main config this
 * boots no Nuxt webServer - the backend dev server and seeded Postgres are
 * the only prerequisites, so the admin suite iterates in seconds:
 *   npx playwright test --config=playwright.admin.config.ts
 * The main config still picks these specs up in CI, where the full stack
 * is running anyway.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /admin-.*\.spec\.ts/,
  timeout: 45_000,
  retries: 0,
  use: {
    ...(process.env.CI ? {} : { channel: 'chrome' as const }),
    screenshot: 'only-on-failure' as const,
  },
})
