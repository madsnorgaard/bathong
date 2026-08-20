import { describe, it, expect } from 'vitest'
import { mediaUrl, mediaSrc, frameCredit } from '~/utils/media'
import { richTextParagraphs, richTextPlain } from '~/utils/richtext'

describe('mediaUrl', () => {
  it('prefixes relative CMS urls', () => {
    expect(mediaUrl({ url: '/api/media/file/x.jpg' }, 'http://localhost:3001')).toBe(
      'http://localhost:3001/api/media/file/x.jpg',
    )
  })
  it('strips a trailing slash on the CMS origin', () => {
    expect(mediaUrl({ url: '/m.jpg' }, 'http://localhost:3001/')).toBe(
      'http://localhost:3001/m.jpg',
    )
  })
  it('passes through absolute urls and rejects unpopulated relations', () => {
    expect(mediaUrl({ url: 'https://cdn.example.org/m.jpg' }, 'http://x')).toBe(
      'https://cdn.example.org/m.jpg',
    )
    expect(mediaUrl('42', 'http://x')).toBeNull()
    expect(mediaUrl(null, 'http://x')).toBeNull()
  })
})

describe('mediaSrc (relative paths keep images on the ipx alias)', () => {
  it('returns the relative CMS path untouched', () => {
    expect(mediaSrc({ url: '/api/media/file/x.jpg' })).toBe('/api/media/file/x.jpg')
  })
  it('strips the origin from absolute Payload media urls (production shape)', () => {
    // Payload prefixes media.url with serverURL in production; an absolute
    // src bypasses the ipx alias and hangs on the unreachable public host.
    expect(mediaSrc({ url: 'https://api.bathong.africa/api/media/file/x.jpg' })).toBe(
      '/api/media/file/x.jpg',
    )
    expect(mediaSrc({ url: 'http://localhost:3001/api/media/file/x.jpg' })).toBe(
      '/api/media/file/x.jpg',
    )
  })
  it('passes through genuinely external urls and rejects unpopulated relations', () => {
    expect(mediaSrc({ url: 'https://cdn.example.org/m.jpg' })).toBe('https://cdn.example.org/m.jpg')
    expect(mediaSrc('42')).toBeNull()
    expect(mediaSrc(null)).toBeNull()
  })
})

describe('frameCredit (every photograph is credited)', () => {
  it('prefers the override', () => {
    expect(frameCredit({ creditOverride: 'Thabo Mokoena', photographer: { name: 'X' } })).toBe(
      'Thabo Mokoena',
    )
  })
  it('falls back to the photographer relation, then the collective', () => {
    expect(frameCredit({ photographer: { name: 'Alet Pretorius' } })).toBe('Alet Pretorius')
    expect(frameCredit({})).toBe('Bathong. Collective')
  })
})

describe('richText helpers', () => {
  const doc = {
    root: {
      type: 'root',
      children: [
        { type: 'paragraph', children: [{ text: 'First light.' }] },
        { type: 'paragraph', children: [{ text: '  ' }] },
        { type: 'paragraph', children: [{ text: 'Bring one lens.' }] },
      ],
    },
  }
  it('extracts trimmed paragraphs, dropping empties', () => {
    expect(richTextParagraphs(doc)).toEqual(['First light.', 'Bring one lens.'])
  })
  it('joins to a single line', () => {
    expect(richTextPlain(doc)).toBe('First light. Bring one lens.')
  })
  it('handles null docs', () => {
    expect(richTextParagraphs(null)).toEqual([])
  })
})
