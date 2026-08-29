import type { Photocall, Rsvp, Submission, Walk } from '../payload-types'

/**
 * Every outbound email as a pure { subject, text } builder. Plain text on
 * purpose: the brand is ink and paper, text renders everywhere, and there is
 * no HTML to escape around user-supplied names. The From identity
 * (BATHONG. <noreply@bathong.africa>) comes from the adapter defaults.
 */

const SIGNATURE = '\n\nBATHONG.\nhttps://bathong.africa'

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

// ---- accounts ---------------------------------------------------------------
// "Bathong." is the mark: it goes on anything about an account or money.

export const verifyEmail = (name: string, link: string) => ({
  subject: 'Confirm your Bathong. email',
  text:
    `Hi ${name},\n\n` +
    `One step before you sign in: confirm this address.\n\n` +
    `${link}\n\n` +
    `You can ask for a new link from the sign-in page. ` +
    `If you did not make an account, ignore this email and nothing happens.` +
    SIGNATURE,
})

export const accountExists = (forgotLink: string) => ({
  subject: 'You already have a Bathong. account',
  text:
    `Hi,\n\n` +
    `Someone tried to sign up with this address, and it already has an account. ` +
    `If that was you, sign in. Forgotten the password? Set a new one:\n\n` +
    `${forgotLink}\n\n` +
    `If it was not you, nothing has changed.` +
    SIGNATURE,
})

export const emailChangeVerify = (name: string, link: string) => ({
  subject: 'Confirm your new Bathong. email',
  text:
    `Hi ${name},\n\n` +
    `You asked to move your Bathong. account to this address. Confirm it within the hour:\n\n` +
    `${link}\n\n` +
    `Confirming signs you out everywhere; sign in again with this address. ` +
    `If you did not ask for this, ignore this email and nothing changes.` +
    SIGNATURE,
})

export const emailChangeNotice = (name: string, newEmail: string, contact: string) => ({
  subject: 'Your Bathong. email is changing',
  text:
    `Hi ${name},\n\n` +
    `Someone signed in to your account asked to move it to ${newEmail}. ` +
    `Nothing changes until that address confirms it.\n\n` +
    `If this was not you, change your password now from your security page and write to ${contact}.` +
    SIGNATURE,
})

export const passwordChanged = (name: string, contact: string) => ({
  subject: 'Your Bathong. password was changed',
  text:
    `Hi ${name},\n\n` +
    `The password on your account was changed just now, and every other device was signed out.\n\n` +
    `If this was not you, set a new password from the sign-in page straight away and write to ${contact}.` +
    SIGNATURE,
})

export const accountDeleted = (name: string) => ({
  subject: 'Your Bathong. account is closed',
  text:
    `Hi ${name},\n\n` +
    `Your account and personal details are deleted. RSVPs and entries you made now name nobody. ` +
    `Work you published stays on the site with your name on it, as agreed when you published.\n\n` +
    `Thank you for walking with us. The door stays open.` +
    SIGNATURE,
})

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-ZA', { dateStyle: 'long', timeZone: 'Africa/Johannesburg' }).format(new Date(iso))

const planWord = (plan: string) => (plan === 'annual' ? 'annual' : 'monthly')
const rand = (n: number) => `R${n}`
export const memberNo = (n: number) => `№ ${String(n).padStart(4, '0')}`

export interface BankDetails {
  accountName?: string | null
  bankName?: string | null
  accountNumber?: string | null
  branchCode?: string | null
  accountType?: string | null
  paymentNote?: string | null
}

export const joinInstructions = (
  name: string,
  order: { plan: string; amount: number; joiningFee: number; reference: string },
  bank: BankDetails,
) => {
  const bankLines = [
    bank.accountName,
    bank.bankName,
    bank.accountNumber ? `Account ${bank.accountNumber}` : null,
    bank.branchCode ? `Branch ${bank.branchCode}` : null,
    bank.accountType,
  ].filter(Boolean)
  return {
    subject: 'Your Bathong. membership: how to pay',
    text:
      `Hi ${name},\n\n` +
      `You chose the ${planWord(order.plan)} plan.\n\n` +
      `Amount: ${rand(order.amount)}${order.joiningFee ? ` (${rand(order.joiningFee)} joining fee included)` : ''}\n` +
      `Reference: ${order.reference}\n\n` +
      (bankLines.length ? `Pay by EFT to:\n${bankLines.join('\n')}\n\n` : `Bank details follow from us by reply.\n\n`) +
      `Use the reference exactly as shown. ` +
      `${bank.paymentNote ?? 'We confirm EFTs by hand, usually within two working days.'}\n\n` +
      `When the payment shows, we activate your membership and send your member number.` +
      SIGNATURE,
  }
}

export const membershipActivated = (
  name: string,
  memberNumber: number,
  plan: string,
  until: string,
  deskLink: string,
) => ({
  subject: `Welcome in. Member ${memberNo(memberNumber)}`,
  text:
    `Hi ${name},\n\n` +
    `Payment received. Your membership is active.\n\n` +
    `Member ${memberNo(memberNumber)}\n` +
    `Plan: ${plan === 'annual' ? 'Annual' : 'Monthly'}\n` +
    `Runs until: ${longDate(until)}\n\n` +
    `Your card sits on your desk: ${deskLink}\n` +
    `Add a portrait and switch on "Show me on the roster" when you want your page public.\n\n` +
    `Membership cards supported by the Press Club NPC.` +
    SIGNATURE,
})

export const editorNewJoin = (
  name: string,
  email: string,
  plan: string,
  amount: number,
  reference: string,
  adminLink: string,
) => ({
  subject: `New join (${planWord(plan)}): ${reference}`,
  text:
    `${name} <${email}> chose ${planWord(plan)}. ${rand(amount)}, reference ${reference}.\n` +
    `Mark it paid here once the EFT shows:\n${adminLink}`,
})

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
