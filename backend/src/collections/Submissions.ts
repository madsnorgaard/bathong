import type { Access, CollectionConfig, Where } from 'payload'
import { APIError } from 'payload'
import { hasEditorRole, isAdmin, isEditorField, isMember } from '../access'
import { richTextParagraphs } from '../email/lexical'
import { getContactEmail, sendSafe } from '../email/send'
import { editorNewEntry, entryReceipt, entryVerdict } from '../email/templates'

/** Submitters see their own submissions; editors see everything. */
const canReadSubmission: Access = ({ req: { user } }) => {
  if (!user) return false
  if (hasEditorRole(user)) return true
  return { submitter: { equals: user.id } }
}

/** Submitters may edit only while the submission is still 'submitted'; editors always. */
const canUpdateSubmission: Access = ({ req: { user } }) => {
  if (!user) return false
  if (hasEditorRole(user)) return true
  const ownWhileSubmitted: Where = {
    and: [{ submitter: { equals: user.id } }, { status: { equals: 'submitted' } }],
  }
  return ownWhileSubmitted
}

const relationId = (value: unknown): number | string | undefined => {
  if (value && typeof value === 'object') return (value as { id?: number | string }).id
  return value as number | string | undefined
}

export const Submissions: CollectionConfig = {
  slug: 'submissions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'photocall', 'submitter', 'status'],
    group: 'Programme',
  },
  access: {
    create: isMember,
    read: canReadSubmission,
    update: canUpdateSubmission,
    delete: isAdmin,
  },
  fields: [
    { name: 'photocall', type: 'relationship', relationTo: 'photocalls', required: true },
    {
      name: 'submitter',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        description:
          'Set automatically from the logged-in user; empty for anonymous photocall entries. Never changes afterwards.',
      },
    },
    {
      name: 'submitterName',
      type: 'text',
      admin: { description: 'Anonymous entries: the photographer name as given.' },
    },
    {
      name: 'submitterEmail',
      type: 'email',
      access: { read: isEditorField },
      admin: { description: 'Anonymous entries: contact email. Editors only.' },
    },
    {
      name: 'whereYouShoot',
      type: 'text',
    },
    { name: 'title', type: 'text' },
    { name: 'statement', type: 'textarea' },
    {
      name: 'images',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
      required: true,
      minRows: 1,
    },
    {
      name: 'agreedToTerms',
      type: 'checkbox',
      required: true,
      validate: (value: boolean | null | undefined) =>
        value === true || 'You must agree to the photocall terms before submitting.',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'submitted',
      options: [
        { label: 'Submitted', value: 'submitted' },
        { label: 'Shortlisted', value: 'shortlisted' },
        { label: 'Published', value: 'published' },
        { label: 'Rejected', value: 'rejected' },
      ],
      access: { update: isEditorField },
    },
    {
      name: 'reviewNotes',
      type: 'richText',
      admin: { description: 'Feedback visible to the submitter.' },
    },
    {
      name: 'internalNotes',
      type: 'richText',
      access: { read: isEditorField },
      admin: { description: 'Editorial notes - never shown to the submitter.' },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc, context }) => {
        if (operation === 'create') {
          // Logged-in entries pin the user; anonymous ones carry name + email.
          if (req.user) {
            data.submitter = req.user.id
          } else if (!data.submitterName || !data.submitterEmail) {
            throw new APIError('An entry needs a name and an email.', 400)
          }

          // Only accept submissions while the photocall is actually open.
          const photocallId = relationId(data.photocall)
          if (!photocallId) {
            throw new APIError('A submission must belong to a photocall.', 400)
          }
          const photocall = await req.payload.findByID({
            collection: 'photocalls',
            id: photocallId,
            depth: 0,
          })
          if (!photocall || photocall.status !== 'open') {
            throw new APIError('This photocall is not open for submissions.', 400)
          }
          const now = new Date()
          if (photocall.opensAt && new Date(photocall.opensAt as string) > now) {
            throw new APIError('This photocall has not opened yet.', 400)
          }
          if (photocall.closesAt && new Date(photocall.closesAt as string) < now) {
            throw new APIError('This photocall has closed.', 400)
          }

          // Keep submitted images out of public view until they are published.
          const imageIds = (Array.isArray(data.images) ? data.images : [])
            .map(relationId)
            .filter((id): id is number | string => id !== undefined)
          for (const id of imageIds) {
            await req.payload.update({
              collection: 'media',
              id,
              data: { visibility: 'restricted' },
              context: { fromSubmissionSync: true },
            })
          }
        }

        if (operation === 'update' && originalDoc && !context?.closingAccount) {
          // The submitter is immutable after creation; only a closing
          // account (accountSecurity.ts) unlinks it.
          data.submitter = relationId(originalDoc.submitter) ?? originalDoc.submitter
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, context }) => {
        // Guard against re-entry from our own media updates.
        if (context?.fromSubmissionSync) return

        // When a submission is published, its images become public.
        if (doc.status === 'published' && previousDoc?.status !== 'published') {
          const imageIds = (Array.isArray(doc.images) ? doc.images : [])
            .map((image: unknown) => relationId(image))
            .filter((id: number | string | undefined): id is number | string => id !== undefined)
          for (const id of imageIds) {
            await req.payload.update({
              collection: 'media',
              id,
              data: { visibility: 'public' },
              context: { fromSubmissionSync: true },
            })
          }
        }
      },
      // Submitter-facing mail: a receipt on entry, the written verdict when an
      // editor moves the status. Sends are fire-and-forget - a dead SMTP hop
      // must never fail a committed entry or an editorial save.
      async ({ doc, previousDoc, req, operation, context }) => {
        if (context?.fromSubmissionSync || context?.skipEmails) return

        const verdictStatuses = ['shortlisted', 'published', 'rejected'] as const
        type Verdict = (typeof verdictStatuses)[number]
        const isVerdict =
          operation === 'update' &&
          doc.status !== previousDoc?.status &&
          verdictStatuses.includes(doc.status as Verdict)
        if (operation !== 'create' && !isVerdict) return

        // Anonymous entries carry submitterEmail; member entries only a user
        // relation (the local API bypasses the editor-only field gate here).
        let email: string | undefined = doc.submitterEmail
        let name: string = doc.submitterName || 'there'
        try {
          const submitterId = relationId(doc.submitter)
          if (!email && submitterId) {
            const user = await req.payload.findByID({
              collection: 'users',
              id: submitterId,
              depth: 0,
              req,
            })
            email = user?.email
            name = doc.submitterName || user?.name || name
          }
          if (!email) {
            req.payload.logger.warn({ submission: doc.id }, 'submission email skipped: no recipient')
            return
          }
          const photocallId = relationId(doc.photocall)
          const photocall = await req.payload.findByID({
            collection: 'photocalls',
            id: photocallId as number | string,
            depth: 0,
            req,
          })

          const contactEmail = await getContactEmail(req)
          if (operation === 'create') {
            sendSafe(req, {
              ...entryReceipt(doc, photocall, name),
              to: email,
              replyTo: contactEmail,
            })
            sendSafe(req, {
              ...editorNewEntry(doc, photocall, req.payload.config.serverURL),
              to: contactEmail,
              replyTo: email,
            })
          } else {
            const notes = richTextParagraphs(doc.reviewNotes)
            sendSafe(req, {
              ...entryVerdict(doc.status as Verdict, photocall, notes, name),
              to: email,
              replyTo: contactEmail,
            })
          }
        } catch (err) {
          req.payload.logger.error({ err, submission: doc.id }, 'submission email skipped')
        }
      },
    ],
  },
}
