import { describe, expect, it } from 'vitest'
import { lexicalLength } from '../src/lib/lexical'

const doc = (texts: string[]) => ({
  root: {
    type: 'root',
    children: texts.map((text) => ({ type: 'paragraph', children: [{ type: 'text', text }] })),
  },
})

describe('lexicalLength', () => {
  it('counts the text across paragraphs and nested nodes', () => {
    expect(lexicalLength(doc(['abc', 'de']))).toBe(5)
    expect(
      lexicalLength({
        root: { children: [{ type: 'list', children: [{ type: 'listitem', children: [{ type: 'text', text: 'four' }] }] }] },
      }),
    ).toBe(4)
  })
  it('is zero for empty, odd or missing documents', () => {
    expect(lexicalLength(null)).toBe(0)
    expect(lexicalLength('text')).toBe(0)
    expect(lexicalLength({ root: { children: [] } })).toBe(0)
    expect(lexicalLength({ root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 7 }] }] } })).toBe(0)
  })
})
