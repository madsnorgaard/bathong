import { describe, it, expect } from 'vitest'
import { albumImageCredit } from '~/utils/albums'

describe('albumImageCredit', () => {
  const album = 'Alet Pretorius; Jacques Nelles'

  it("uses the file's own credit when it carries one", () => {
    expect(albumImageCredit({ credit: 'Alet Pretorius' }, album)).toBe('Alet Pretorius')
  })
  it('falls back to the album credit when the file has none', () => {
    expect(albumImageCredit({}, album)).toBe(album)
    expect(albumImageCredit({ credit: null }, album)).toBe(album)
    expect(albumImageCredit({ credit: '  ' }, album)).toBe(album)
  })
})
