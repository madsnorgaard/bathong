import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
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
import { Albums } from './collections/Albums'
import { Walks } from './collections/Walks'
import { Exhibitions } from './collections/Exhibitions'
import { Photocalls } from './collections/Photocalls'
import { Submissions } from './collections/Submissions'
import { Orders } from './collections/Orders'
import { Rsvps } from './collections/Rsvps'
import { photocallEntry } from './endpoints/photocallEntry'
import { framesIndex } from './endpoints/framesIndex'
import { archive } from './endpoints/archive'
import { accountResendVerification, accountSignUp } from './endpoints/accountSignUp'
import { accountJoin } from './endpoints/accountJoin'
import { e2eHooks } from './endpoints/e2eHooks'
import { SiteSettings } from './globals/SiteSettings'
import { Manifesto } from './globals/Manifesto'
import { Membership } from './globals/Membership'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Fail fast: a missing secret must never fall back to a guessable default,
// and a missing database URI should stop the boot, not surface as a
// confusing connection error later.
for (const name of ['PAYLOAD_SECRET', 'DATABASE_URI'] as const) {
  if (!process.env[name]) {
    throw new Error(`${name} is required. Set it in the environment (see .env.example).`)
  }
}

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
    Albums,
    Walks,
    Exhibitions,
    Photocalls,
    Submissions,
    Orders,
    Rsvps,
  ],
  globals: [SiteSettings, Manifesto, Membership],
  endpoints: [
    photocallEntry,
    framesIndex,
    archive,
    accountSignUp,
    accountResendVerification,
    accountJoin,
    ...e2eHooks,
  ],
  editor: lexicalEditor(),
  // The frontend is REST-only; removing the GraphQL surface (and with it the
  // unauthenticated playground route) beats gating it.
  graphQL: { disable: true },
  secret: process.env.PAYLOAD_SECRET as string,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI as string },
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
  // Email: real SMTP when configured (production talks to the collective's
  // mail server as noreply@), console logging otherwise - in local-only dev
  // Payload prints would-be emails instead of sending them.
  ...(process.env.SMTP_HOST
    ? {
        email: nodemailerAdapter({
          defaultFromAddress: process.env.SMTP_FROM || 'noreply@bathong.africa',
          defaultFromName: 'BATHONG.',
          transportOptions: {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 465),
            // implicit TLS on 465; STARTTLS upgrade on 587
            secure: Number(process.env.SMTP_PORT || 465) === 465,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          },
        }),
      }
    : {}),
})
