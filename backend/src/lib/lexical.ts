/** Characters of text in a Lexical document, whatever its nodes. */
export function lexicalLength(doc: unknown): number {
  const walk = (node: unknown): number => {
    if (!node || typeof node !== 'object') return 0
    const n = node as { text?: unknown; children?: unknown[]; root?: unknown }
    if (n.root) return walk(n.root)
    const own = typeof n.text === 'string' ? n.text.length : 0
    const children: unknown[] = Array.isArray(n.children) ? n.children : []
    return children.reduce<number>((sum, c) => sum + walk(c), own)
  }
  return walk(doc)
}

/** The bio on a profile is a few lines, not an essay. */
export const BIO_MAX = 2000
