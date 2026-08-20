/**
 * Import a folder of photographs as Media + Frames from a manifest.
 *
 * Usage (inside the payload container, or locally with .env):
 *   npx tsx src/seed/import-frames.ts /path/to/dir/manifest.json
 *
 * The manifest sits next to the image files:
 *   {
 *     "credit": "Jacques Nelles",              // media credit line
 *     "photographerSlugs": ["jacques-nelles"], // People slugs, first match wins
 *     "frames": [{ "file": "...jpg", "alt": "...", "caption": "...", "location": "..." }]
 *   }
 *
 * Frames are created in manifest order, so the array order is the site's
 * reverse-chronology: the front page leads with the newest frame, meaning the
 * intended lead goes LAST in the manifest. Idempotent - a frame whose media
 * filename already exists is skipped, so reruns only fill gaps.
 */
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '@payload-config'

interface ManifestFrame {
  file: string
  alt: string
  caption?: string
  location?: string
}
interface Manifest {
  credit: string
  photographerSlugs: string[]
  frames: ManifestFrame[]
}

async function run() {
  const manifestPath = process.argv[2]
  if (!manifestPath) {
    console.error('Usage: tsx src/seed/import-frames.ts /path/to/manifest.json')
    process.exit(1)
  }
  const dir = path.dirname(path.resolve(manifestPath))
  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  const payload = await getPayload({ config })

  let person = null
  for (const slug of manifest.photographerSlugs) {
    const found = await payload.find({
      collection: 'people',
      where: { slug: { equals: slug } },
      limit: 1,
    })
    if (found.docs[0]) {
      person = found.docs[0]
      break
    }
  }
  if (!person) {
    console.error(`No People profile found for slugs: ${manifest.photographerSlugs.join(', ')}`)
    process.exit(1)
  }
  console.log(`Photographer: ${person.name} (#${person.id})`)

  let created = 0
  let skipped = 0
  for (const item of manifest.frames) {
    const filePath = path.join(dir, item.file)
    if (!fs.existsSync(filePath)) {
      console.error(`  MISSING on disk, skipping: ${item.file}`)
      continue
    }

    const existingMedia = await payload.find({
      collection: 'media',
      where: { filename: { equals: item.file } },
      limit: 1,
    })
    let media = existingMedia.docs[0]
    if (!media) {
      media = await payload.create({
        collection: 'media',
        data: { alt: item.alt, credit: manifest.credit, visibility: 'public' },
        filePath,
      })
    }

    const existingFrame = await payload.find({
      collection: 'frames',
      where: { image: { equals: media.id } },
      limit: 1,
    })
    if (existingFrame.docs[0]) {
      skipped++
      continue
    }
    await payload.create({
      collection: 'frames',
      data: {
        image: media.id,
        photographer: person.id,
        caption: item.caption,
        location: item.location,
      },
    })
    created++
    console.log(`  frame: ${item.file}`)
  }

  console.log(`Done: ${created} frames created, ${skipped} already present.`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
