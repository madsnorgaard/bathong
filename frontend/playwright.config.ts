import { defineConfig } from '@playwright/test'

/**
 * Expects the local stack to be up:
 *   docker compose -f ../docker-compose.dev.yml up -d
 *   (cd ../backend && npm run migrate && SEED_DEMO=true npm run seed && npm run dev)
 *   the frontend is built and served by webServer below.
 * CI runs the same suite against the built backend (`npm run build` and
 * `npm run start` in ../backend, see .github/workflows/ci.yml); either
 * backend on port 3001 will do.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 30_000,
  // No retries, so a failure is a failure. Three specs allow one retry on CI
  // only, where they have raced (#224); they say so at the top of the file.
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    // Use the installed Chrome locally; CI installs chromium explicitly.
    channel: process.env.CI ? undefined : 'chrome',
    // A failing CI run keeps its trace; ci.yml uploads test-results as an artifact.
    trace: 'retain-on-failure',
  },
  webServer: {
    // Production build: the 1 MB budget is only honest against minified
    // output, and hydration timing matches what visitors get.
    command: 'npm run build && node .output/server/index.mjs',
    url: 'http://localhost:3000',
    // To iterate on specs against a build you just made, start it yourself
    // (`node .output/server/index.mjs`) and set E2E_REUSE_SERVER=1.
    reuseExistingServer: process.env.E2E_REUSE_SERVER === '1',
    timeout: 300_000,
  },
})
