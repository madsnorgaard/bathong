import { test, expect } from '@playwright/test'

/**
 * The share row: a word and typographic links, no icons. WhatsApp and mail
 * are plain anchors that carry "Bathong! <title>" and the canonical URL from
 * the configured site origin (never the request host); "Copy link" exists
 * only where the clipboard does. Runs against the SEED_DEMO content.
 */

const SITE = 'https://bathong.africa'

const PAGES: Array<{ path: string; title: string; label?: string }> = [
  { path: '/stories/demo-reader-essay', title: 'Demo: the reader test essay' },
  { path: '/walks/demo-past-walk', title: 'Demo: the walk that was' },
  { path: '/albums/demo-behind-the-walk', title: 'Demo: behind the walk' },
  { path: '/photographers/mads-norgaard', title: 'Mads Nørgaard' },
  { path: '/photocalls', title: 'Demo: open call', label: 'Pass it on' },
]

for (const { path, title, label = 'Share' } of PAGES) {
  test(`${path} carries the share row in the voice`, async ({ page }) => {
    await page.goto(path)
    const row = page.getByRole('navigation', { name: label })
    await expect(row).toBeVisible()

    const whatsapp = row.getByRole('link', { name: /WhatsApp →/ })
    const href = (await whatsapp.getAttribute('href')) ?? ''
    expect(href.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(href.slice('https://wa.me/?text='.length))).toBe(
      `Bathong! ${title}\n${SITE}${path}`,
    )
    await expect(whatsapp).toHaveAttribute('rel', /noopener/)

    const mail = row.getByRole('link', { name: /Email →/ })
    expect((await mail.getAttribute('href')) ?? '').toMatch(/^mailto:\?subject=Bathong/)

    // every label in the row ends with the arrow, except the state word
    for (const text of await row.locator('a, button').allTextContents()) {
      expect(text.trim()).toMatch(/→$|^Copied\.$/)
    }
  })
}

test('copy link puts the canonical URL on the clipboard and says so', async ({ page }) => {
  // The browser's clipboard permission model differs between headless
  // chromium and a headed channel; what is under test is the row's own
  // behaviour, so the write is captured rather than trusted to the OS.
  await page.addInitScript(() => {
    const written: string[] = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          written.push(text)
        },
        readText: async () => written[written.length - 1] ?? '',
      },
    })
  })
  await page.goto('/walks/demo-past-walk', { waitUntil: 'networkidle' })
  const row = page.getByRole('navigation', { name: 'Share' })
  // the row has one button, and its accessible name changes on click
  const copy = row.getByRole('button')
  await expect(copy).toHaveText('Copy link →')
  await copy.click()
  await expect(copy).toHaveText('Copied.')
  await expect(row.getByRole('status')).toHaveText('Link copied.')
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe(`${SITE}/walks/demo-past-walk`)
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the two anchors still share; the copy control is not promised', async ({ page }) => {
    await page.goto('/walks/demo-past-walk')
    const row = page.getByRole('navigation', { name: 'Share' })
    await expect(row.getByRole('link', { name: /WhatsApp →/ })).toBeVisible()
    await expect(row.getByRole('link', { name: /Email →/ })).toBeVisible()
    await expect(row.getByRole('button')).toHaveCount(0)
  })
})
