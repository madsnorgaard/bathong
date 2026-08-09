/**
 * Dev/demo seed. Idempotent (keyed on slugs, emails and filenames), never
 * auto-run: `npm run seed` only.
 *
 * Content rules apply to fixtures too: no invented prices or dates. The only
 * real programme item is Walk № 001 (Saturday 29 August 2026, Church Square).
 * State-testing fixtures (a full walk, a bookingUrl walk) are clearly marked
 * demo content and only created with SEED_DEMO=true.
 *
 * Admin user: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, otherwise the
 * admin panel's first-user flow applies.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const photosDir = path.resolve(dirname, '../../../design-system/assets/photos/johannesburg')

/** Minimal Lexical doc from plain paragraphs. */
const lex = (paragraphs: string[]) => ({
  root: {
    type: 'root',
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
      children: [{ type: 'text', text, detail: 0, format: 0, mode: 'normal', style: '', version: 1 }],
    })),
  },
})

async function ensureMedia(payload: Payload, filename: string, alt: string) {
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
  })
  if (existing.docs[0]) return existing.docs[0]
  const created = await payload.create({
    collection: 'media',
    data: { alt, credit: 'Mads Nørgaard', visibility: 'public' },
    filePath: path.join(photosDir, filename),
  })
  console.log(`  media: ${filename}`)
  return created
}

async function run() {
  const payload = await getPayload({ config })
  console.log('Seeding...')

  // ---- users ----
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (adminEmail && adminPassword) {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: adminEmail } },
      limit: 1,
    })
    if (!existing.docs.length) {
      await payload.create({
        collection: 'users',
        data: {
          name: process.env.SEED_ADMIN_NAME || 'Bathong admin',
          email: adminEmail,
          password: adminPassword,
          roles: ['admin' as const],
        },
        overrideAccess: true,
      })
      console.log(`  user: ${adminEmail} (admin)`)
    }
  }

  // ---- people: the founding circle (role proposal; titles editable in CMS) ----
  const directors = [
    { name: 'Emmanuel Munano', slug: 'emmanuel-munano', roleTitle: 'Founder and CEO', order: 1 },
    { name: 'Jacques Nel', slug: 'jacques-nel', roleTitle: 'Chief Operating Officer', order: 2 },
    {
      name: 'Alet Pretorius',
      slug: 'alet-pretorius',
      roleTitle: 'Director of Photography and Education',
      order: 3,
    },
    {
      name: 'Mads Nørgaard',
      slug: 'mads-norgaard',
      roleTitle: 'Director of International Programmes and Partnerships',
      order: 4,
    },
  ]
  const peopleBySlug: Record<string, number> = {}
  for (const person of directors) {
    const existing = await payload.find({
      collection: 'people',
      where: { slug: { equals: person.slug } },
      limit: 1,
    })
    if (existing.docs[0]) {
      peopleBySlug[person.slug] = existing.docs[0].id
      continue
    }
    const created = await payload.create({
      collection: 'people',
      data: { ...person, foundingCircle: true },
    })
    peopleBySlug[person.slug] = created.id
    console.log(`  person: ${person.name}`)
  }

  // ---- media + frames: demo frames, credited, marked as placeholders ----
  const demoFrames = [
    { file: 'street-0001.jpg', location: 'Johannesburg' },
    { file: 'street-0002.jpg', location: 'Johannesburg' },
    { file: 'street-0003.jpg', location: 'Johannesburg' },
    { file: 'doc-0009.jpg', location: 'Johannesburg' },
    { file: 'doc-0016.jpg', location: 'Johannesburg' },
    { file: 'doc-0024.jpg', location: 'Johannesburg' },
  ]
  for (const frame of demoFrames) {
    const media = await ensureMedia(
      payload,
      frame.file,
      `Street photograph, ${frame.location}, 2018.`,
    )
    const existing = await payload.find({
      collection: 'frames',
      where: { image: { equals: media.id } },
      limit: 1,
    })
    if (existing.docs.length) continue
    await payload.create({
      collection: 'frames',
      data: {
        image: media.id,
        photographer: peopleBySlug['mads-norgaard'],
        caption: 'PHOTO SLOT: demo frame, to be replaced by a Pretoria lead frame.',
        location: frame.location,
        year: 2018,
        tags: ['demo'],
      },
    })
    console.log(`  frame: ${frame.file}`)
  }

  // ---- walks ----
  const walk001 = await payload.find({
    collection: 'walks',
    where: { slug: { equals: 'walk-001-first-light' } },
    limit: 1,
  })
  if (!walk001.docs.length) {
    await payload.create({
      collection: 'walks',
      data: {
        title: 'First light, three layers of the capital',
        slug: 'walk-001-first-light',
        date: '2026-08-29T05:30:00+02:00',
        endTime: '2026-08-29T09:30:00+02:00',
        meetingPoint: 'Church Square, Pretoria',
        route: lex([
          'Church Square → Marabastad → Salvokop. Four hours on foot.',
          'Bring one lens. No experience needed, no gear requirement, everyone welcome.',
        ]),
        capacity: 25,
        priceMember: 0,
        priceNonMember: null,
        bookingStatus: 'open',
        leader: peopleBySlug['emmanuel-munano'],
        _status: 'published',
      },
    })
    console.log('  walk: № 001')
  }
  // Future walks are real intentions without dates; dates are never invented,
  // so they stay drafts until the collective sets them.
  for (const draft of [
    { title: 'Rooftop session', slug: 'walk-002-rooftop-session' },
    { title: 'Night walk, Sunnyside', slug: 'walk-003-night-walk-sunnyside' },
  ]) {
    const existing = await payload.find({
      collection: 'walks',
      where: { slug: { equals: draft.slug } },
      limit: 1,
    })
    if (existing.docs.length) continue
    await payload.create({
      collection: 'walks',
      data: {
        title: draft.title,
        slug: draft.slug,
        date: '2026-08-29T05:30:00+02:00', // placeholder; draft is never public
        bookingStatus: 'closed',
        _status: 'draft',
      },
    })
    console.log(`  walk (draft): ${draft.title}`)
  }

  // ---- demo state fixtures (e2e): SEED_DEMO=true only ----
  if (process.env.SEED_DEMO === 'true') {
    // A demo essay so the reader exists before Essay 001 does. Clearly demo:
    // demo frames, demo copy, replaced by the group edit after Walk 001.
    const existingEssay = await payload.find({
      collection: 'essays',
      where: { slug: { equals: 'demo-reader-essay' } },
      limit: 1,
    })
    if (!existingEssay.docs.length) {
      const frameDocs = await payload.find({
        collection: 'frames',
        sort: 'createdAt',
        limit: 6,
        depth: 0,
      })
      const ids = frameDocs.docs.map((f) => f.id)
      if (ids.length >= 6) {
        await payload.create({
          collection: 'essays',
          data: {
            title: 'Demo: the reader test essay',
            slug: 'demo-reader-essay',
            deck: 'Six demo frames standing in for the first group edit. PHOTO SLOT throughout.',
            leadFrame: ids[0],
            sequence: [
              { blockType: 'frame', frame: ids[0], fullBleed: true },
              {
                blockType: 'text',
                body: lex([
                  'A walk produces frames. A group edit turns frames into an essay. This demo essay exists so the reader is ready before Essay 001 is.',
                ]),
              },
              { blockType: 'frame', frame: ids[1] },
              { blockType: 'pair', left: ids[2], right: ids[3] },
              {
                blockType: 'text',
                body: lex(['Text appears where the sequence needs it, never front-loaded.']),
              },
              { blockType: 'frame', frame: ids[4] },
              { blockType: 'frame', frame: ids[5] },
            ],
            contributors: [peopleBySlug['mads-norgaard']],
            publishedDate: '2026-08-01',
            tags: ['demo'],
            _status: 'published',
          },
        })
        console.log('  essay (demo): the reader test essay')
      }
    }
    const demoWalks = [
      {
        title: 'Demo: full walk',
        slug: 'demo-full-walk',
        date: '2026-09-05T05:30:00+02:00',
        meetingPoint: 'Demo meeting point',
        capacity: 1,
        bookingStatus: 'open' as const,
      },
      {
        title: 'Demo: external booking',
        slug: 'demo-external-booking',
        date: '2026-09-12T05:30:00+02:00',
        meetingPoint: 'Demo meeting point',
        capacity: 25,
        bookingUrl: 'https://example.com/booking',
        bookingStatus: 'open' as const,
      },
    ]
    for (const walk of demoWalks) {
      const existing = await payload.find({
        collection: 'walks',
        where: { slug: { equals: walk.slug } },
        limit: 1,
      })
      if (existing.docs.length) continue
      await payload.create({
        collection: 'walks',
        data: { ...walk, priceMember: 0, _status: 'published' },
      })
      console.log(`  walk (demo): ${walk.title}`)
    }
  }

  // ---- globals ----
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      siteTitle: 'Bathong.',
      // contactEmail stays unset until the hello@ mailbox exists (issue #16).
      facebook: 'https://www.facebook.com/bathongafrica',
      linkedin: 'https://www.linkedin.com/company/bathong',
      ticker: [
        { text: 'Bathong!' },
        { text: 'among the people' },
        { text: 'Pitori · 012' },
        { text: 'Walk № 001 · Sat 29 Aug · 05:30 · Church Square' },
      ],
    },
  })
  console.log('  global: site-settings')

  await payload.updateGlobal({
    slug: 'manifesto',
    data: {
      headword: 'ba·thong',
      senses: [
        { text: "what you say when you can't believe what you're seeing." },
        { text: 'among the people - where this work is made.' },
      ],
      body: lex([
        'We build photographers who are there when it happens.',
        'A walk produces frames. A group edit turns frames into an essay. An essay earns a wall. A wall makes a photographer.',
        'You keep your copyright. Always.',
      ]),
      _status: 'published',
    },
  })
  console.log('  global: manifesto')

  await payload.updateGlobal({
    slug: 'membership',
    data: {
      benefits: [
        { title: 'Photowalks', description: 'Every walk, free for members.' },
        { title: 'The group edit', description: 'Your frames on the table, edited together.' },
        { title: 'The wall', description: 'Member work is first in line for exhibitions.' },
        { title: 'Copyright', description: 'You keep your copyright. Always.' },
      ],
      priceIndividual: null,
      priceStudent: null,
      priceNote: 'Launch pricing announced soon',
      _status: 'published',
    },
  })
  console.log('  global: membership')

  console.log('Seed complete.')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
