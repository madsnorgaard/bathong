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
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
