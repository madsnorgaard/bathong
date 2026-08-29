/**
 * Dev/demo seed. Idempotent (keyed on slugs, emails and filenames), never
 * auto-run: `npm run seed` only.
 *
 * Content rules apply to fixtures too: no invented prices or dates. The only
 * real programme item is Walk № 001 (Saturday 29 August 2026, Church Square).
 * State-testing fixtures (a past walk to link work to, a next walk with a
 * route, a full walk, a bookingUrl walk, an album) are clearly marked demo
 * content and only created with SEED_DEMO=true. Their dates are relative to
 * the seed run by design, so the e2e suite never ages out; rerunning the
 * seed moves them forward.
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

/** An ISO timestamp `days` from today at `hour` o'clock SAST (UTC+2). */
const daysFromNow = (days: number, hour: number) => {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days, hour - 2, 0, 0),
  ).toISOString()
}

/**
 * Idempotent on the alt text, not the filename: Payload renames an upload
 * whose file already sits in MEDIA_DIR (a reset database over the tracked
 * demo originals), so the stored filename cannot be trusted to match.
 */
async function ensureMedia(payload: Payload, filename: string, alt: string) {
  const existing = await payload.find({
    collection: 'media',
    where: { or: [{ alt: { equals: alt } }, { filename: { equals: filename } }] },
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
          // verification is on: a fresh database must still have an admin who can sign in
          _verified: true,
        } as never,
        overrideAccess: true,
        disableVerificationEmail: true,
      })
      console.log(`  user: ${adminEmail} (admin)`)
    }
  }

  // ---- people: the founding circle (role proposal; titles editable in CMS) ----
  const directors = [
    { name: 'Emmanuel Munano', slug: 'emmanuel-munano', roleTitle: 'Founder and CEO', order: 1, memberNumber: 1 },
    { name: 'Jacques Nelles', slug: 'jacques-nelles', roleTitle: 'Chief Operating Officer', order: 2, memberNumber: 2 },
    {
      name: 'Alet Pretorius',
      slug: 'alet-pretorius',
      roleTitle: 'Director of Photography and Education',
      order: 3,
      memberNumber: 3,
    },
    {
      name: 'Mads Nørgaard',
      slug: 'mads-norgaard',
      roleTitle: 'Director of International Programmes and Partnerships',
      order: 4,
      memberNumber: 4,
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
      data: { ...person, foundingCircle: true, onRoster: true },
    })
    peopleBySlug[person.slug] = created.id
    console.log(`  person: ${person.name}`)
  }

  // ---- demo member (SEED_DEMO): the account the sign-in e2e uses (#13) ----
  if (process.env.SEED_DEMO === 'true') {
    const memberEmail = 'member@bathong.local'
    const memberPassword = process.env.SEED_MEMBER_PASSWORD || 'bathong-member-dev'
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: memberEmail } },
      limit: 1,
    })
    if (!existing.docs.length) {
      await payload.create({
        collection: 'users',
        data: {
          name: 'Demo Member',
          email: memberEmail,
          password: memberPassword,
          roles: ['member' as const],
          membershipPlan: 'monthly',
          membershipStatus: 'active',
          memberSince: '2026-08-01T00:00:00+02:00',
          profile: peopleBySlug['mads-norgaard'] ?? null,
          _verified: true,
        } as never,
        overrideAccess: true,
        disableVerificationEmail: true,
      })
      console.log(`  user: ${memberEmail} (member)`)
    } else if (existing.docs[0].membershipPlan !== 'monthly') {
      // The plan column arrived after this account did on older stacks.
      await payload.update({
        collection: 'users',
        id: existing.docs[0].id,
        data: { membershipPlan: 'monthly', membershipStatus: 'active' },
        overrideAccess: true,
      })
      console.log(`  user: ${memberEmail} (plan set)`)
    }
    // The demo member owns the Mads profile, so profile self-service is testable.
    const demoMember = await payload.find({
      collection: 'users',
      where: { email: { equals: memberEmail } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const madsId = peopleBySlug['mads-norgaard']
    if (demoMember.docs[0] && madsId) {
      const mads = await payload.findByID({ collection: 'people', id: madsId, depth: 0 })
      if (!mads.owner) {
        await payload.update({
          collection: 'people',
          id: madsId,
          data: { owner: demoMember.docs[0].id, onRoster: true },
          overrideAccess: true,
          context: { syncingOwner: true },
        })
        await payload.update({
          collection: 'users',
          id: demoMember.docs[0].id,
          data: { profile: madsId },
          overrideAccess: true,
          context: { syncingOwner: true },
        })
        console.log('  person: mads-norgaard owned by the demo member')
      }
    }
  }

  // ---- media + frames: demo frames, credited, marked as placeholders ----
  // SEED_DEMO only: production holds real frames, and a rerun of the seed
  // there (to refresh the globals) must never put placeholders back.
  const demoFrames =
    process.env.SEED_DEMO === 'true'
      ? [
          { file: 'street-0001.jpg', location: 'Johannesburg' },
          { file: 'street-0002.jpg', location: 'Johannesburg' },
          { file: 'street-0003.jpg', location: 'Johannesburg' },
          { file: 'doc-0009.jpg', location: 'Johannesburg' },
          { file: 'doc-0016.jpg', location: 'Johannesburg' },
          { file: 'doc-0024.jpg', location: 'Johannesburg' },
        ]
      : []
  // Payload renames an upload whose file already sits in MEDIA_DIR (a reset
  // database with leftover files), so later steps take media from this map
  // rather than trusting the filename twice.
  const mediaByFile: Record<string, { id: number }> = {}
  for (const frame of demoFrames) {
    // One alt per file: the seed's idempotency key, and honest demo copy.
    const media = await ensureMedia(
      payload,
      frame.file,
      `Street photograph, ${frame.location}, 2018. Demo ${frame.file.replace(/\.jpg$/, '')}.`,
    )
    mediaByFile[frame.file] = media
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
  // Walk 001 route: the inner-city loop as traced from Jacques' sketch, snapped
  // to OSM street geometry (draft until Jacques signs it off). Coordinates are
  // [lng, lat]. One LineString is the route; Point features are the landmark
  // markers the frontend renders as labels.
  const walk001RouteGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Walk 001 loop' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [28.1881, -25.746], // Church Square, north edge
            [28.188, -25.74576], // Paul Kruger St, north
            [28.18797, -25.74499],
            [28.18785, -25.74372],
            [28.18764, -25.74203], // Struben St corner (the park)
            [28.18779, -25.74202], // Struben St, east
            [28.19013, -25.74185],
            [28.192, -25.74174],
            [28.19256, -25.74171], // Lilian Ngoyi St corner
            [28.19271, -25.74317], // Lilian Ngoyi St, south
            [28.19283, -25.7446],
            [28.19296, -25.7462], // Helen Joseph St corner
            [28.19171, -25.74622], // Helen Joseph St, west to Queen St
            [28.19165, -25.74548], // Queen Street, the pedestrian lane, north
            [28.19159, -25.74474], // Madiba St corner
            [28.19042, -25.74483], // Madiba St, west
            [28.18941, -25.7449],
            [28.18874, -25.74494],
            [28.18797, -25.74499], // Paul Kruger St corner
            [28.188, -25.74576], // Paul Kruger St, south
            [28.1881, -25.746], // back to Church Square
          ],
        },
      },
      {
        type: 'Feature',
        properties: { name: 'Church Square', kind: 'start' },
        geometry: { type: 'Point', coordinates: [28.1881, -25.746] },
      },
      {
        type: 'Feature',
        properties: { name: 'Home Affairs' },
        geometry: { type: 'Point', coordinates: [28.18944, -25.74388] },
      },
      {
        type: 'Feature',
        properties: { name: 'Queen Street' },
        geometry: { type: 'Point', coordinates: [28.19165, -25.74548] },
      },
      {
        type: 'Feature',
        properties: { name: 'Navy House' },
        geometry: { type: 'Point', coordinates: [28.1912, -25.74465] },
      },
    ],
  }
  const walk001Route = lex([
    'A loop through the inner city: Church Square, up Paul Kruger, along Struben, down Lilian Ngoyi past the State Theatre, back through Queen Street and Madiba. Route is a draft until Jacques signs it off.',
    'Bring one lens. No experience needed, no gear requirement, everyone welcome.',
  ])
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
        date: '2026-08-29T06:00:00+02:00',
        endTime: '2026-08-29T10:00:00+02:00',
        meetingPoint: 'Church Square, Pretoria',
        route: walk001Route,
        routeGeo: walk001RouteGeo,
        capacity: 25,
        priceMember: 0,
        priceNonMember: null,
        bookingStatus: 'open',
        leader: peopleBySlug['emmanuel-munano'],
        _status: 'published',
      },
    })
    console.log('  walk: № 001')
  } else if (!walk001.docs[0].routeGeo) {
    // Already-seeded stacks pick up the route without a reseed.
    await payload.update({
      collection: 'walks',
      id: walk001.docs[0].id,
      data: { route: walk001Route, routeGeo: walk001RouteGeo },
    })
    console.log('  walk: № 001 (routeGeo backfilled)')
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
    // Demo walks carry relative dates. The past walk is the deterministic
    // link target for essays, frames and albums; the next walk keeps a route
    // on /walks so the map and RSVP specs stay honest after Walk 001 wraps.
    const demoWalks = [
      {
        title: 'Demo: the walk that was',
        slug: 'demo-past-walk',
        date: daysFromNow(-21, 6),
        endTime: daysFromNow(-21, 10),
        meetingPoint: 'Church Square, Pretoria',
        route: lex([
          'Demo copy of the Walk 001 loop, so essays, frames and albums have a walk to link to.',
        ]),
        routeGeo: walk001RouteGeo,
        capacity: 25,
        bookingStatus: 'closed' as const,
        leader: peopleBySlug['emmanuel-munano'],
      },
      {
        title: 'Demo: the next loop',
        slug: 'demo-next-walk',
        date: daysFromNow(14, 6),
        endTime: daysFromNow(14, 10),
        meetingPoint: 'Church Square, Pretoria',
        route: walk001Route,
        routeGeo: walk001RouteGeo,
        capacity: 25,
        bookingStatus: 'open' as const,
        leader: peopleBySlug['emmanuel-munano'],
      },
      {
        title: 'Demo: full walk',
        slug: 'demo-full-walk',
        date: daysFromNow(21, 5),
        meetingPoint: 'Demo meeting point',
        capacity: 1,
        bookingStatus: 'open' as const,
      },
      {
        title: 'Demo: external booking',
        slug: 'demo-external-booking',
        date: daysFromNow(28, 5),
        meetingPoint: 'Demo meeting point',
        capacity: 25,
        bookingUrl: 'https://example.com/booking',
        bookingStatus: 'open' as const,
      },
    ]
    const walksBySlug: Record<string, number> = {}
    for (const walk of demoWalks) {
      const existing = await payload.find({
        collection: 'walks',
        where: { slug: { equals: walk.slug } },
        limit: 1,
        depth: 0,
      })
      if (existing.docs[0]) {
        walksBySlug[walk.slug] = existing.docs[0].id
        // Relative dates drift: keep the fixture where the specs expect it.
        await payload.update({
          collection: 'walks',
          id: existing.docs[0].id,
          data: { date: walk.date, endTime: walk.endTime ?? null, routeGeo: walk.routeGeo ?? null },
        })
        continue
      }
      const created = await payload.create({
        collection: 'walks',
        data: { ...walk, priceMember: 0, _status: 'published' },
      })
      walksBySlug[walk.slug] = created.id
      console.log(`  walk (demo): ${walk.title}`)
    }
    const demoPastWalk = walksBySlug['demo-past-walk']

    // A demo essay so the reader exists before Essay 001 does. Clearly demo:
    // demo frames, demo copy, replaced by the group edit after Walk 001.
    const existingEssay = await payload.find({
      collection: 'essays',
      where: { slug: { equals: 'demo-reader-essay' } },
      limit: 1,
      depth: 0,
    })
    if (existingEssay.docs[0] && !(existingEssay.docs[0].walks ?? []).length) {
      await payload.update({
        collection: 'essays',
        id: existingEssay.docs[0].id,
        data: { walks: [demoPastWalk] },
      })
      console.log('  essay (demo): linked to the demo past walk')
    }
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
            walks: [demoPastWalk],
            // the day after the walk it came out of
            publishedDate: daysFromNow(-20, 9),
            tags: ['demo'],
            _status: 'published',
          },
        })
        console.log('  essay (demo): the reader test essay')
      }
    }

    // Two demo frames come from the past walk, so the walk record and the
    // archive's walk filter have something to show.
    for (const file of ['street-0001.jpg', 'street-0002.jpg']) {
      const media = mediaByFile[file]
      if (!media) continue
      const frame = await payload.find({
        collection: 'frames',
        where: { image: { equals: media.id } },
        limit: 1,
        depth: 0,
      })
      if (!frame.docs[0] || frame.docs[0].walk) continue
      await payload.update({
        collection: 'frames',
        id: frame.docs[0].id,
        data: { walk: demoPastWalk },
      })
      console.log(`  frame: ${file} linked to the demo past walk`)
    }

    // A demo album: the softer record of the past walk, plain media only.
    const existingAlbum = await payload.find({
      collection: 'albums',
      where: { slug: { equals: 'demo-behind-the-walk' } },
      limit: 1,
      depth: 0,
    })
    if (!existingAlbum.docs.length) {
      const albumMedia = ['doc-0009.jpg', 'doc-0016.jpg', 'doc-0024.jpg']
        .map((file) => mediaByFile[file])
        .filter(Boolean)
      await payload.create({
        collection: 'albums',
        data: {
          title: 'Demo: behind the walk',
          slug: 'demo-behind-the-walk',
          intro:
            'Three demo photographs standing in for the group shot, the edit table and the coffee after. PHOTO SLOT throughout.',
          images: albumMedia.map((m) => m.id),
          walks: [demoPastWalk],
          photographer: peopleBySlug['mads-norgaard'],
          date: daysFromNow(-21, 6),
          publishedDate: daysFromNow(-20, 9),
          _status: 'published',
        },
      })
      console.log('  album (demo): behind the walk')
    }

    // A demo photocall so the entry flow is testable end to end. SEED_DEMO
    // only, like everything in this block: a stray run on production once
    // put a demo call with a live entry form on the site. Dates are
    // relative and refreshed on rerun so the call never quietly closes.
    const callOpens = daysFromNow(-7, 0)
    const callCloses = daysFromNow(21, 23)
    const existingCall = await payload.find({
      collection: 'photocalls',
      where: { slug: { equals: 'demo-open-call' } },
      limit: 1,
      depth: 0,
    })
    if (existingCall.docs[0]) {
      await payload.update({
        collection: 'photocalls',
        id: existingCall.docs[0].id,
        data: { opensAt: callOpens, closesAt: callCloses, status: 'open' },
      })
    } else {
      await payload.create({
        collection: 'photocalls',
        data: {
          title: 'Demo: open call',
          slug: 'demo-open-call',
          theme: lex([
            'A demo brief standing in for Photocall 001. What we are looking for, what we are not looking for, and how the edit will be made.',
            'Photocall 001 opens after the first walk, with its licence text signed off.',
          ]),
          opensAt: callOpens,
          closesAt: callCloses,
          maxImagesPerSubmission: 8,
          membersOnly: false,
          terms: lex([
            'Demo terms: you keep your copyright. You grant the collective a non-exclusive licence to publish selected frames with credit. Real terms land with issue #21.',
          ]),
          status: 'open',
          _status: 'published',
        },
      })
      console.log('  photocall (demo): open call')
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
        { text: 'from Pretoria outward' },
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
        'Bathong. is a street and documentary photography collective. It starts in Pretoria, among the people, and walks outward from there: across the city, and in time across South Africa.',
        'A collective, not a club. We walk together and we edit together. The founding circle looks at your frames and tells you what they see, frame by frame, online or in person. That is the teaching.',
        'We photograph people as they are. Not always a happy story. Always a true one, at face value.',
        'The people around the collective are part of it: photographers, editors, printers and friends who come to talk, to look at work, and to open doors.',
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
        {
          title: 'The edit',
          description: 'Your frames on the table with the founding circle. Online or in person.',
        },
        { title: 'Feedback', description: 'Frame by frame. Honest, at face value.' },
        {
          title: 'Talks',
          description: 'Sessions with the photographers, editors and friends around the collective.',
        },
        { title: 'Publication', description: 'Photocalls, essays and the archive, always credited.' },
        { title: 'The wall', description: 'Member work is first in line for exhibitions.' },
        {
          title: 'The card',
          description: 'A membership card and your member number, for monthly and annual members.',
        },
        { title: 'Copyright', description: 'You keep your copyright. Always.' },
      ],
      // Decided 29 Aug 2026: one membership, one price, no tiers.
      joiningFee: 250,
      priceMonthly: 100,
      priceAnnual: 1000,
      priceNote:
        'The card and your member number come with a monthly or annual membership. Monthly can stop any time.',
      openDoorNote: 'If the fee is what stands between you and the collective, write to us anyway.',
      // Bank details are real content: the seed sets honest placeholders
      // only for demo stacks, never on production.
      ...(process.env.SEED_DEMO === 'true'
        ? {
            referencePrefix: 'BTG',
            bank: {
              accountName: 'Bathong. Collective (demo) TBC',
              bankName: 'Bank TBC',
              accountNumber: 'TBC',
              branchCode: 'TBC',
              accountType: 'Cheque',
            },
          }
        : {}),
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
