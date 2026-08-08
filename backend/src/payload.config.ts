import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { People } from './collections/People'
import { Media } from './collections/Media'
import { Frames } from './collections/Frames'
import { Essays } from './collections/Essays'
import { Walks } from './collections/Walks'
import { Exhibitions } from './collections/Exhibitions'
import { Photocalls } from './collections/Photocalls'
import { Submissions } from './collections/Submissions'
import { Orders } from './collections/Orders'
import { Rsvps } from './collections/Rsvps'
import { SiteSettings } from './globals/SiteSettings'
import { Manifesto } from './globals/Manifesto'
import { Membership } from './globals/Membership'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3001',
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' - Bathong.',
      description: 'Editorial desk for the Bathong. street photography collective.',
    },
  },
  collections: [
    Users,
    People,
    Media,
    Frames,
    Essays,
    Walks,
    Exhibitions,
    Photocalls,
    Submissions,
    Orders,
    Rsvps,
  ],
  globals: [SiteSettings, Manifesto, Membership],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
    // Migrations are the source of truth (run on container start). Opt into
    // Drizzle dev-push only when explicitly requested.
    push: process.env.PAYLOAD_DB_PUSH === 'true',
  }),
  cors: corsOrigins,
  csrf: corsOrigins,
  sharp,
  upload: {
    // Street photography stills only - 50 MB is plenty for a full-res scan.
    limits: { fileSize: 52_428_800 }, // 50 MB
  },
  // Email adapter - SMTP gets wired later. When it does:
  // import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
  // email: nodemailerAdapter({
  //   defaultFromAddress: process.env.SMTP_FROM || '',
  //   defaultFromName: 'Bathong.',
  //   transportOptions: { host: process.env.SMTP_HOST, port: 465, secure: true, auth: { ... } },
  // }),
})
