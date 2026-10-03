import { describe, it, expect } from 'vitest'
import { albumPhoto, barLine, framePhoto } from '~/server/utils/shareCards'

const media = (name: string, credit?: string | null) => ({
  credit,
  sizes: { og: { url: `/api/media/file/${name}-1200x630.jpg` } },
  url: `/api/media/file/${name}.jpg`,
})

describe('framePhoto (credit travels with the frame)', () => {
  it('takes the og size and the photographer name', () => {
    expect(framePhoto({ image: media('a'), photographer: { name: 'Alet Pretorius' } })).toEqual({
      credit: 'Alet Pretorius',
      url: '/api/media/file/a-1200x630.jpg',
    })
  })
  it('lets the credit override win', () => {
    const photo = framePhoto({
      creditOverride: 'Guest',
      image: media('a'),
      photographer: { name: 'Alet Pretorius' },
    })
    expect(photo?.credit).toBe('Guest')
  })
  it('is null for an unpopulated frame or image', () => {
    expect(framePhoto(12)).toBeNull()
    expect(framePhoto(null)).toBeNull()
    expect(framePhoto({ image: 7, photographer: { name: 'x' } })).toBeNull()
  })
})

describe('albumPhoto (the cover names its own photographer)', () => {
  const album = 'Alet Pretorius; Jacques Nelles'
  it("uses the first file's own credit when it carries one", () => {
    const photo = albumPhoto({ creditOverride: album, images: [media('a', 'Alet Pretorius'), media('b')] })
    expect(photo).toEqual({ credit: 'Alet Pretorius', url: '/api/media/file/a-1200x630.jpg' })
  })
  it('falls back to the album credit, override before profile', () => {
    expect(albumPhoto({ creditOverride: album, images: [media('a', ' ')] })?.credit).toBe(album)
    expect(albumPhoto({ images: [media('a')], photographer: { name: 'Jacques Nelles' } })?.credit).toBe(
      'Jacques Nelles',
    )
  })
  it('is null without a populated first photograph', () => {
    expect(albumPhoto({ images: [] })).toBeNull()
    expect(albumPhoto({ images: [3] })).toBeNull()
    expect(albumPhoto(undefined)).toBeNull()
  })
})

describe('barLine', () => {
  it('uppercases and leaves a short line whole', () => {
    expect(barLine('Sunnyside at Night')).toBe('SUNNYSIDE AT NIGHT')
  })
  it('clips a long line to the bar', () => {
    const line = barLine('First light, three layers of the capital and then some more of it', 46)
    expect(line.length).toBeLessThanOrEqual(46)
    expect(line.endsWith('...')).toBe(true)
  })
})
