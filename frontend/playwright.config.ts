import { defineConfig } from '@playwright/test'

/**
 * Expects the local stack to be up:
 *   docker compose -f ../docker-compose.dev.yml up -d
 *   (cd ../backend && npm run migrate && SEED_DEMO=true npm run seed && npm run dev)
 *   frontend dev server boots via webServer below.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    // Use the installed Chrome locally; CI installs chromium explicitly.
    channel: process.env.CI ? undefined : 'chrome',
  },
  webServer: {
    // Production build: the 1 MB budget is only honest against minified
    // output, and hydration timing matches what visitors get.
    command: 'npm run build && node .output/server/index.mjs',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 300_000,
  },
})
