import type { Endpoint, PayloadRequest } from 'payload'
import sharp from 'sharp'
import { bad } from './respond'

/**
 * The one door for anonymous photocall entries (W6: anyone can enter).
 * Collection create on submissions and media stays members/editors only;
 * this endpoint is the scoped, hardened alternative:
 *  - honeypot, open-window and duplicate checks before any file is touched
 *  - file count capped by the call's maxImagesPerSubmission
 *  - per-file and total size caps well under the global upload limit
 *  - content sniffing via sharp: the declared mimetype is never trusted
 *  - media created restricted, credited to the entrant, editor-only until
 *    published (the existing submission hooks keep that contract)
 * Traefik rate-limits this path alongside login and RSVPs.
 */

const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20 MB per frame
const MAX_TOTAL_BYTES = 80 * 1024 * 1024 // 80 MB per entry
const SNIFFED_FORMATS = new Set(['jpeg', 'png', 'webp', 'tiff', 'avif'])
const MIME_BY_FORMAT: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  tiff: 'image/tiff',
  avif: 'image/avif',
}

export const photocallEntry: Endpoint = {
  path: '/photocall-entries',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    let form: FormData
    try {
      form = await (req as unknown as Request).formData()
    } catch {
      return bad('Could not read the entry.')
    }

    const text = (key: string) => {
      const v = form.get(key)
      return typeof v === 'string' ? v.trim() : ''
    }

    // honeypot: bots that fill it get a generic refusal
    if (text('website')) return bad('Could not process this entry.')

    const name = text('name')
    const email = text('email')
    const whereYouShoot = text('whereYouShoot')
    const statement = text('statement')
    const photocallId = text('photocall')
    const agreed = text('agreedToTerms') === 'true'

    if (!name || !email || !photocallId) return bad('An entry needs a name, an email and a photocall.')
    if (!agreed) return bad('You must agree to the photocall terms before submitting.')

    const photocall = await req.payload
      .findByID({ collection: 'photocalls', id: photocallId, depth: 0 })
      .catch(() => null)
    if (!photocall || photocall._status !== 'published' || photocall.status !== 'open') {
      return bad('This photocall is not open for entries.')
    }
    const now = new Date()
    if (photocall.opensAt && new Date(photocall.opensAt) > now) {
      return bad('This photocall has not opened yet.')
    }
    if (photocall.closesAt && new Date(photocall.closesAt) < now) {
      return bad('This photocall has closed.')
    }
    if (photocall.membersOnly && !req.user) {
      return bad('This photocall is open to members only.', 403)
    }

    const duplicate = await req.payload.count({
      collection: 'submissions',
      where: {
        and: [{ photocall: { equals: photocall.id } }, { submitterEmail: { equals: email } }],
      },
    })
    if (duplicate.totalDocs > 0) {
      return bad('This email has already entered this photocall.')
    }

    const files = form.getAll('frames').filter((f): f is File => f instanceof File && f.size > 0)
    const maxFrames = photocall.maxImagesPerSubmission ?? 5
    if (files.length < 1) return bad('An entry needs at least one frame.')
    if (files.length > maxFrames) return bad(`This call takes up to ${maxFrames} frames.`)
    const totalBytes = files.reduce((n, f) => n + f.size, 0)
    if (totalBytes > MAX_TOTAL_BYTES) return bad('The entry is too heavy. Keep it under 80 MB in total.')

    // sniff every file before anything is written
    const checked: { buffer: Buffer; mimetype: string; name: string }[] = []
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) return bad('Each frame must be under 20 MB.')
      const buffer = Buffer.from(await file.arrayBuffer())
      let format: string | undefined
      try {
        format = (await sharp(buffer).metadata()).format
      } catch {
        format = undefined
      }
      if (!format || !SNIFFED_FORMATS.has(format)) {
        return bad('Frames must be photographs: JPEG, PNG, WebP, TIFF or AVIF.')
      }
      const safeName = (file.name || 'frame').replace(/[^\w.-]+/g, '-').slice(-80)
      checked.push({ buffer, mimetype: MIME_BY_FORMAT[format], name: safeName })
    }

    // all checks passed: create restricted media, then the submission
    const imageIds: number[] = []
    for (const file of checked) {
      const media = await req.payload.create({
        collection: 'media',
        data: {
          alt: `Photocall entry frame by ${name}.`,
          credit: name,
          visibility: 'restricted',
        },
        file: {
          data: file.buffer,
          mimetype: file.mimetype,
          name: file.name,
          size: file.buffer.length,
        },
        overrideAccess: true,
      })
      imageIds.push(media.id)
    }

    const submission = await req.payload.create({
      collection: 'submissions',
      data: {
        photocall: photocall.id,
        submitterName: name,
        submitterEmail: email,
        whereYouShoot: whereYouShoot || undefined,
        statement: statement || undefined,
        title: `${name} - ${photocall.title}`,
        images: imageIds,
        agreedToTerms: true,
      },
      overrideAccess: true,
      req,
    })

    return Response.json({ id: submission.id, frames: imageIds.length }, { status: 201 })
  },
}
