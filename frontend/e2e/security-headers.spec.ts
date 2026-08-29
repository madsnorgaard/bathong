import { test, expect } from '@playwright/test'

/**
 * Security headers (#37): the CSP is nonce-based with no unsafe-inline for
 * scripts, the baseline headers ride on every HTML response exactly once,
 * and the pages that load the riskiest things (the maplibre worker on
 * /walks, the upload form on /photocalls, the plausible stub everywhere)
 * produce no CSP violations in the console. Runs against the production
 * build, which is the only build the policy is honest for.
 */

const BASELINE: Record<string, string> = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'x-dns-prefetch-control': 'off',
}

test('the home page carries a nonce-based CSP and the baseline headers once', async ({ request }) => {
  const res = await request.get('/')
  expect(res.ok()).toBeTruthy()

  const csp = res.headers()['content-security-policy']
  expect(csp, 'content-security-policy header').toBeTruthy()
  const scriptSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src '))
  expect(scriptSrc).toBeTruthy()
  expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=_-]+'/)
  expect(scriptSrc).toContain("'strict-dynamic'")
  expect(scriptSrc).not.toContain("'unsafe-inline'")
  expect(csp).toContain("frame-ancestors 'none'")
  expect(csp).toContain("object-src 'none'")

  const all = res.headersArray().map((h) => h.name.toLowerCase())
  for (const [name, value] of Object.entries(BASELINE)) {
    expect(res.headers()[name], name).toBe(value)
    expect(all.filter((n) => n === name), `${name} emitted once`).toHaveLength(1)
  }
  expect(res.headers()['permissions-policy']).toMatch(/camera=\(\)/)
  expect(all.filter((n) => n === 'content-security-policy')).toHaveLength(1)
  // HSTS is Traefik's job; the app must not emit a competing copy.
  expect(res.headers()['strict-transport-security']).toBeUndefined()
})

test('every inline script in the SSR html carries the response nonce', async ({ request }) => {
  const res = await request.get('/')
  const nonce = res.headers()['content-security-policy'].match(/'nonce-([^']+)'/)?.[1]
  expect(nonce).toBeTruthy()
  const html = await res.text()
  const scripts = html.match(/<script\b[^>]*>/g) ?? []
  expect(scripts.length).toBeGreaterThan(0)
  for (const tag of scripts) expect(tag, tag).toContain(`nonce="${nonce}"`)
})

for (const path of [
  '/',
  '/walks',
  '/walks/demo-past-walk',
  '/photocalls',
  '/stories',
  '/stories/demo-reader-essay',
  '/albums',
  '/albums/demo-behind-the-walk',
  '/photographers/mads-norgaard',
]) {
  test(`${path} renders without CSP violations`, async ({ page }) => {
    const violations: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      if (/Content Security Policy|Refused to/i.test(text)) violations.push(text)
    })
    page.on('pageerror', (err) => violations.push(err.message))
    await page.goto(path, { waitUntil: 'networkidle' })
    expect(violations).toEqual([])
  })
}
