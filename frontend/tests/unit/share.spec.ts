import { describe, it, expect } from 'vitest'
import { canonicalUrl, shareLinks, shareText } from '~/utils/share'

describe('shareText (the voice)', () => {
  it('leads with Bathong! and puts the link on its own line', () => {
    expect(shareText('First light', 'https://bathong.africa/walks/x')).toBe(
      'Bathong! First light\nhttps://bathong.africa/walks/x',
    )
  })
})

describe('shareLinks', () => {
  const links = shareLinks('First light & shadow', 'https://bathong.africa/walks/x?v=1')
  it('is a wa.me link with the text encoded exactly once', () => {
    expect(links.whatsapp.startsWith('https://wa.me/?text=')).toBe(true)
    const text = decodeURIComponent(links.whatsapp.slice('https://wa.me/?text='.length))
    expect(text).toBe('Bathong! First light & shadow\nhttps://bathong.africa/walks/x?v=1')
    expect(links.whatsapp).not.toContain('&shadow')
  })
  it('is a mailto with subject and body', () => {
    const url = new URL(links.email)
    expect(url.protocol).toBe('mailto:')
    expect(url.searchParams.get('subject')).toBe('Bathong! First light & shadow')
    expect(url.searchParams.get('body')).toContain('https://bathong.africa/walks/x?v=1')
  })
})

describe('canonicalUrl (never the request host)', () => {
  it('joins the configured origin and the path, tolerating trailing slashes', () => {
    expect(canonicalUrl('https://bathong.africa/', '/walks/x')).toBe('https://bathong.africa/walks/x')
    expect(canonicalUrl('https://bathong.africa', 'walks/x')).toBe('https://bathong.africa/walks/x')
    expect(canonicalUrl('https://bathong.africa', '/')).toBe('https://bathong.africa/')
  })
})
