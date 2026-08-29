import { describe, it, expect } from 'vitest'
import { paragraphsToLexical } from '~/utils/lexical'
import { richTextParagraphs } from '~/utils/richtext'

describe('paragraphsToLexical', () => {
  it('makes one paragraph per blank line and reads back through richTextParagraphs', () => {
    const doc = paragraphsToLexical('First line.\n\nSecond, with a\nsoft break.\r\n\r\n\n  Third.  ')
    expect(doc.root.children).toHaveLength(3)
    expect(richTextParagraphs(doc as never)).toEqual(['First line.', 'Second, with a soft break.', 'Third.'])
  })
  it('gives an empty document for empty text', () => {
    expect(paragraphsToLexical('   \n\n ').root.children).toEqual([])
    expect(richTextParagraphs(paragraphsToLexical('') as never)).toEqual([])
  })
})
