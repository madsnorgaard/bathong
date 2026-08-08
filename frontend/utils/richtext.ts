/**
 * Minimal Lexical (Payload richText) helpers. No v-html anywhere: we extract
 * plain paragraph strings and render them in templates. A fuller renderer
 * arrives with the essay reader in Phase 2.
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
export function richTextParagraphs(doc: LexicalDoc | null | undefined): string[] {
  const blocks = doc?.root?.children ?? []
  return blocks.map(nodeText).map((t) => t.trim()).filter(Boolean)
}

/** Whole document as one line, for metadata and descriptions. */
export function richTextPlain(doc: LexicalDoc | null | undefined): string {
  return richTextParagraphs(doc).join(' ')
}
