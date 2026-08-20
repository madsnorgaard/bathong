/**
 * Minimal Lexical (Payload richText) plain-text extraction, mirrored from
 * frontend/utils/richtext.ts (the two apps share no package). Emails are
 * plain text, so paragraphs are all we need - no HTML serializer.
 */
interface LexicalNode {
  type?: string
  text?: string
  children?: LexicalNode[]
}

interface LexicalDoc {
  root?: LexicalNode
}

function nodeText(node: LexicalNode): string {
  if (typeof node.text === 'string') return node.text
  return (node.children ?? []).map(nodeText).join('')
}

/** Top-level blocks as trimmed plain-text paragraphs, empties dropped. */
export function richTextParagraphs(doc: unknown): string[] {
  const blocks = (doc as LexicalDoc | null | undefined)?.root?.children ?? []
  return blocks.map(nodeText).map((t) => t.trim()).filter(Boolean)
}
