import type { Photocall, Rsvp, Submission, Walk } from '../payload-types'

/**
 * Every outbound email as a pure { subject, text } builder. Plain text on
 * purpose: the brand is ink and paper, text renders everywhere, and there is
 * no HTML to escape around user-supplied names. The From identity
 * (BATHONG. <noreply@bathong.africa>) comes from the adapter defaults.
 */

const SIGNATURE = '\n\n— BATHONG.\nhttps://bathong.africa'

const walkDate = (walk: Walk): string =>
  new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(walk.date))

const walkDetails = (walk: Walk): string => {
  const lines = [`Walk: ${walk.title}`, `When: ${walkDate(walk)}`]
  if (walk.meetingPoint) lines.push(`Meeting point: ${walk.meetingPoint}`)
  return lines.join('\n')
}

export const rsvpConfirmed = (rsvp: Rsvp, walk: Walk) => ({
  subject: `You're on the list: ${walk.title}`,
  text:
    `Hi ${rsvp.name},\n\n` +
    `Your place on the walk is confirmed.\n\n` +
    `${walkDetails(walk)}\n\n` +
    `Bring one lens. If your plans change, just reply to this email.` +
    SIGNATURE,
})

export const rsvpWaitlisted = (rsvp: Rsvp, walk: Walk) => ({
  subject: `Waitlist: ${walk.title}`,
  text:
    `Hi ${rsvp.name},\n\n` +
    `This walk is currently full, so you're on the waitlist. ` +
    `If a place opens up we'll email you straight away.\n\n` +
    `${walkDetails(walk)}` +
    SIGNATURE,
})

export const rsvpPromoted = (rsvp: Rsvp, walk: Walk) => ({
  subject: `A place opened up: ${walk.title}`,
  text:
    `Hi ${rsvp.name},\n\n` +
    `Good news - a place opened up and your spot on the walk is now confirmed.\n\n` +
    `${walkDetails(walk)}\n\n` +
    `Bring one lens. If your plans change, just reply to this email.` +
    SIGNATURE,
})

export const entryReceipt = (submission: Submission, photocall: Photocall, name: string) => {
  const frames = Array.isArray(submission.images) ? submission.images.length : 0
  return {
    subject: `Entry received: ${photocall.title}`,
    text:
      `Hi ${name},\n\n` +
      `Your entry to ${photocall.title} arrived safely - ` +
      `${frames} frame${frames === 1 ? '' : 's'}.\n\n` +
      `Every entrant gets a written response, frame by frame, once the call closes.` +
      SIGNATURE,
  }
}

const verdictLede: Record<'shortlisted' | 'published' | 'rejected', string> = {
  shortlisted:
    'Your entry has been shortlisted. The final selection lands once the call closes.',
  published: 'Your entry has been selected and published. Thank you for shooting with us.',
  rejected:
    "Your entry didn't make the selection this time. Keep shooting - the next call is never far.",
}

export const entryVerdict = (
  status: 'shortlisted' | 'published' | 'rejected',
  photocall: Photocall,
  notes: string[],
  name: string,
) => {
  const notesBlock = notes.length ? `\n\nNotes from the editors:\n\n${notes.join('\n\n')}` : ''
  return {
    subject: `${photocall.title}: your entry`,
    text: `Hi ${name},\n\n${verdictLede[status]}${notesBlock}` + SIGNATURE,
  }
}

export const editorNewRsvp = (rsvp: Rsvp, walk: Walk, serverURL: string) => ({
  subject: `New RSVP (${rsvp.status}): ${walk.title}`,
  text:
    `${rsvp.name} <${rsvp.email}> - ${rsvp.status}\n` +
    (rsvp.note ? `Note: ${rsvp.note}\n` : '') +
    `\n${serverURL}/admin/collections/rsvps/${rsvp.id}`,
})

export const editorNewEntry = (
  submission: Submission,
  photocall: Photocall,
  serverURL: string,
) => {
  const frames = Array.isArray(submission.images) ? submission.images.length : 0
  return {
    subject: `New photocall entry: ${photocall.title}`,
    text:
      `${submission.submitterName || 'A member'} - ${frames} frame${frames === 1 ? '' : 's'}\n` +
      (submission.whereYouShoot ? `Shoots: ${submission.whereYouShoot}\n` : '') +
      `\n${serverURL}/admin/collections/submissions/${submission.id}`,
  }
}
