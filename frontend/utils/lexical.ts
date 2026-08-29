/**
 * Plain text to a Payload (Lexical) rich-text document: one paragraph per
 * blank-line-separated block, text nodes only. The shape the seed writes,
 * so what a member types in a textarea reads back through richTextBlocks().
 */
export interface LexicalDoc {
  root: {
    type: 'root'
    direction: 'ltr'
    format: ''
    indent: 0
    version: 1
    children: unknown[]
  }
}

export function paragraphsToLexical(text: string): LexicalDoc {
  const paragraphs = text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
  return {
    root: {
      type: 'root',
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
      children: paragraphs.map((t) => ({
        type: 'paragraph',
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
        children: [{ type: 'text', text: t, detail: 0, format: 0, mode: 'normal', style: '', version: 1 }],
      })),
    },
  }
}
