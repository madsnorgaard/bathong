import { test, expect, type Page } from '@playwright/test'

/**
 * UX verification against the direction doc's explicit rules:
 * mobile at 360px is the majority case (W7), hit targets never below 44px,
 * focus is a 3px jacaranda outline never removed, reduced motion stops the
 * ticker and reveals, the lead crops to 4/5 on a phone, no horizontal
 * scroll, and the page still reads without JavaScript (the data-budget
 * visitor's worst case).
 */

const MOBILE = { width: 360, height: 740 }

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'page must not scroll horizontally').toBeLessThanOrEqual(0)
}

test.describe('mobile, the majority case', () => {
  test.use({ viewport: MOBILE })

  test('home: no horizontal scroll, lead crops to 4/5, walk chapter directly under the lead', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await noHorizontalScroll(page)

    const lead = page.locator('.lead-frame')
    const box = await lead.boundingBox()
    expect(box).not.toBeNull()
    // 21/9 on a phone is a stripe; W7 mandates a 4/5 crop.
    const ratio = box!.width / box!.height
    expect(ratio, 'lead frame should be 4/5 portrait on mobile').toBeLessThan(1)

    // the walk chapter follows the lead before anything else
    const leadY = box!.y
    const walkBox = await page.locator('.event').boundingBox()
    expect(walkBox!.y).toBeGreaterThan(leadY)
  })

  test('sheet menu: opens, traps focus, closes on Escape, targets are 44px', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const toggle = page.getByRole('button', { name: /menu/ })
    const toggleBox = await toggle.boundingBox()
    expect(toggleBox!.width, 'menu toggle hit target').toBeGreaterThanOrEqual(44)
    expect(toggleBox!.height, 'menu toggle hit target').toBeGreaterThanOrEqual(44)

    await toggle.click()
    const sheet = page.getByRole('dialog', { name: 'Menu' })
    await expect(sheet).toBeVisible()

    for (const link of await sheet.getByRole('link').all()) {
      const b = await link.boundingBox()
      expect(b!.height, 'sheet link hit target').toBeGreaterThanOrEqual(44)
    }

    // focus is trapped inside the sheet
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab')
    const focusInSheet = await page.evaluate(() =>
      Boolean(document.getElementById('sheet-menu')?.contains(document.activeElement)),
    )
    expect(focusInSheet, 'tab must stay inside the open sheet').toBe(true)

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
  })

  test('walks: the RSVP form is usable with 44px targets and readable states', async ({ page }) => {
    await page.goto('/walks', { waitUntil: 'networkidle' })
    await noHorizontalScroll(page)

    // the honeypot is intentionally not a user control; everything else must hit 44px
    const controls = page.locator(
      '#rsvp input:visible:not([name="website"]), #rsvp textarea:visible, #rsvp button:visible',
    )
    for (const field of await controls.all()) {
      const b = await field.boundingBox()
      expect(b!.height, 'form control hit target').toBeGreaterThanOrEqual(44)
    }
  })
})

test.describe('keyboard and focus', () => {
  test('focus is a visible jacaranda outline, never removed', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.keyboard.press('Tab')
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement
      const s = getComputedStyle(el)
      return { width: s.outlineWidth, color: s.outlineColor, style: s.outlineStyle }
    })
    expect(outline.style).not.toBe('none')
    expect(outline.width).toBe('3px')
    // --focus-ring: jacaranda #7B5CD6
    expect(outline.color).toBe('rgb(123, 92, 214)')
  })

  test('the walks CTA anchor lands on the form', async ({ page }) => {
    await page.goto('/walks', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: /Reserve a place/ }).first().click()
    await expect(page).toHaveURL(/#rsvp/)
    await expect(page.locator('#rsvp')).toBeInViewport()
  })
})

test.describe('reduced motion', () => {
  test('the ticker stops and reveals are visible without scrolling', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/', { waitUntil: 'networkidle' })
    const emulated = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
    expect(emulated, 'reduced-motion emulation must be active').toBe(true)
    // motion.css collapses every animation to 0s under reduced motion; the
    // ticker may keep its name but must have no effective duration.
    const ticker = await page
      .locator('.b-ticker .track')
      .evaluate((el) => ({
        name: getComputedStyle(el).animationName,
        duration: getComputedStyle(el).animationDuration,
      }))
    expect(ticker.name === 'none' || ticker.duration === '0s', 'ticker must not loop').toBe(true)

    // reveal elements must not be stuck invisible
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('.reveal')].filter((el) => getComputedStyle(el).opacity === '0').length,
    )
    expect(hidden, 'no reveal element may stay invisible under reduced motion').toBe(0)
  })
})

test.describe('the data-budget worst case', () => {
  test.use({ javaScriptEnabled: false })

  test('the page reads without JavaScript', async ({ page }) => {
    await page.goto('/walks')
    await expect(page.getByText('№ 001')).toBeVisible()
    await expect(page.getByText(/Church Square/).first()).toBeVisible()
    // reveal sections must be visible in plain SSR HTML (no .reveal class server-side)
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('section')].filter((el) => getComputedStyle(el).opacity === '0').length,
    )
    expect(hidden, 'content must not depend on JS to appear').toBe(0)
  })
})
