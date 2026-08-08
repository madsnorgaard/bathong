#!/usr/bin/env node
// Copies the backend's generated payload-types.ts into frontend/types/.
// --check verifies instead of copying (used in CI alongside tokens:check).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const src = resolve(root, 'backend/src/payload-types.ts')
const dst = resolve(root, 'frontend/types/payload-types.ts')

const header = `/* Copied from backend/src/payload-types.ts by scripts/sync-payload-types.mjs.
 * Do not edit: run \`npm run generate:types\` in backend/, then \`npm run types:sync\` here. */
`

const expected = header + readFileSync(src, 'utf8')

if (process.argv.includes('--check')) {
  let current = ''
  try {
    current = readFileSync(dst, 'utf8')
  } catch {
    // missing file counts as drift
  }
  if (current !== expected) {
    console.error('DRIFT: frontend/types/payload-types.ts is out of date. Run npm run types:sync.')
    process.exit(1)
  }
  console.log('types:check OK')
} else {
  mkdirSync(dirname(dst), { recursive: true })
  writeFileSync(dst, expected)
  console.log('types:sync wrote frontend/types/payload-types.ts')
}
