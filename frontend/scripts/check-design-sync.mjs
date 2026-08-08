#!/usr/bin/env node
// Verifies frontend/assets/css/* has not drifted from design-system/.
// See design-system/SYNC.md for the mirror rules and exceptions.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const pairs = [
  ['design-system/tokens/colors.css', 'frontend/assets/css/colors.css'],
  ['design-system/tokens/typography.css', 'frontend/assets/css/typography.css'],
  ['design-system/tokens/spacing.css', 'frontend/assets/css/spacing.css'],
  ['design-system/tokens/structure.css', 'frontend/assets/css/structure.css'],
  ['design-system/tokens/motion.css', 'frontend/assets/css/motion.css'],
  ['design-system/tokens/base.css', 'frontend/assets/css/base.css'],
  ['design-system/tokens/texture.css', 'frontend/assets/css/texture.css'],
  ['design-system/components/components.css', 'frontend/assets/css/components.css'],
]

let failed = false
for (const [src, dst] of pairs) {
  const a = readFileSync(resolve(root, src), 'utf8')
  const b = readFileSync(resolve(root, dst), 'utf8')
  if (a !== b) {
    console.error(`DRIFT: ${dst} differs from ${src}`)
    failed = true
  }
}

// fonts.css is the documented exception: the frontend copy must equal the
// design-system file minus its Google Fonts @import line.
const fontsSrc = readFileSync(resolve(root, 'design-system/tokens/fonts.css'), 'utf8')
const fontsDst = readFileSync(resolve(root, 'frontend/assets/css/fonts.css'), 'utf8')
const fontsExpected = fontsSrc
  .split('\n')
  .filter((l) => !l.startsWith('@import url("https://fonts.googleapis.com'))
  .join('\n')
if (fontsDst.trim() !== fontsExpected.trim()) {
  console.error('DRIFT: frontend/assets/css/fonts.css differs from design-system/tokens/fonts.css (minus the @import)')
  failed = true
}

if (failed) {
  console.error('\nDesign tokens have drifted. Re-copy from design-system/ per design-system/SYNC.md.')
  process.exit(1)
}
console.log(`tokens:check OK (${pairs.length + 1} files in sync)`)
