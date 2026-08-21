/**
 * Minimal Lexical (Payload richText) helpers. No v-html anywhere: we extract
 * plain text blocks and render them in templates. Paragraphs and lists are
 * the supported shapes; anything else renders as a paragraph of its text.
 */
interface LexicalNode {
  type?: string
  text?: string
  listType?: string
  children?: LexicalNode[]
}

interface LexicalDoc {
  root?: LexicalNode
}

export type RichTextBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }

function nodeText(node: LexicalNode): string {
  if (typeof node.text === 'string') return node.text
  return (node.children ?? []).map(nodeText).join('')
}

/** Top-level blocks with their shape kept: paragraphs, and lists with items. */
export function richTextBlocks(doc: LexicalDoc | null | undefined): RichTextBlock[] {
  const blocks = doc?.root?.children ?? []
  const out: RichTextBlock[] = []
  for (const block of blocks) {
    if (block.type === 'list') {
      const items = (block.children ?? [])
        .map(nodeText)
        .map((t) => t.trim())
        .filter(Boolean)
      if (items.length) out.push({ type: 'list', ordered: block.listType === 'number', items })
    } else {
      const text = nodeText(block).trim()
      if (text) out.push({ type: 'p', text })
    }
  }
  return out
}

/** Trimmed plain-text paragraphs, empties dropped; list items become one paragraph each. */
export function richTextParagraphs(doc: LexicalDoc | null | undefined): string[] {
  return richTextBlocks(doc).flatMap((b) => (b.type === 'list' ? b.items : [b.text]))
}

/** Whole document as one line, for metadata and descriptions. */
export function richTextPlain(doc: LexicalDoc | null | undefined): string {
  return richTextParagraphs(doc).join(' ')
}
