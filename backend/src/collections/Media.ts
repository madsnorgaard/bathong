import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'
import { isMember } from '../access'
import { canManageMedia, canReadMedia } from '../access/media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { useAsTitle: 'filename', group: 'System' },
  access: {
    read: canReadMedia,
    create: isMember,
    update: canManageMedia,
    delete: canManageMedia,
  },
  upload: {
    // In Docker set MEDIA_DIR=/app/media (bind-mounted volume); locally -> repo /media.
    staticDir: process.env.MEDIA_DIR || path.resolve(dirname, '../../../media'),
    // Explicit raster types only - excludes image/svg+xml (SVG can carry XSS).
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/avif'],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 400, position: 'centre' },
      { name: 'card', width: 768 },
      { name: 'feature', width: 1280 },
      { name: 'hero', width: 2200 },
      {
        // Share-card rendition: always JPEG q82 per the share-cards spec
        // (crawler-safe format, under the WhatsApp size ceiling).
        name: 'og',
        width: 1200,
        height: 630,
        position: 'centre',
        formatOptions: { format: 'jpeg', options: { quality: 82 } },
      },
    ],
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    // The hook receives headers only (no doc), so per-visibility values are
    // impossible. A global public TTL is safe while nothing shared caches in
    // this stack (Traefik does not cache; browser caches are per-user and
    // restricted files only ever 200 for their uploader, their entrant and
    // editors). Revisit before ever putting a CDN in front of the api host.
    modifyResponseHeaders: ({ headers }) => {
      headers.set('cache-control', 'public, max-age=86400')
      return headers
    },
  },
  fields: [
    { name: 'alt', type: 'text', admin: { description: 'Alt text for accessibility.' } },
    { name: 'credit', type: 'text', admin: { description: 'Photographer / source credit.' } },
    {
      name: 'visibility',
      type: 'select',
      defaultValue: 'public',
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Restricted', value: 'restricted' },
      ],
      admin: {
        description: 'Restricted files are only visible to the uploader and editors.',
      },
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { hidden: true },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create' && req.user) {
          data.uploadedBy = req.user.id
        }
        return data
      },
    ],
  },
}
