import { describe, expect, it } from 'vitest'
import * as templates from '../src/email/templates'

const walk = { id: 1, title: 'First light', date: '2026-08-29T04:00:00.000Z', meetingPoint: 'Church Square' }
const rsvp = { id: 1, name: 'Thabo', email: 't@example.org', status: 'confirmed' as const, walk: 1 }
const photocall = { id: 1, title: 'Still here' }
const submission = { id: 1, images: [1, 2], submitterName: 'Thabo' }

const every = () => [
  templates.rsvpConfirmed(rsvp as never, walk as never),
  templates.rsvpWaitlisted(rsvp as never, walk as never),
  templates.rsvpPromoted(rsvp as never, walk as never),
  templates.entryReceipt(submission as never, photocall as never, 'Thabo'),
  templates.entryVerdict('rejected', photocall as never, ['Frame two: closer.'], 'Thabo'),
  templates.editorNewRsvp(rsvp as never, walk as never, 'https://api.example'),
  templates.editorNewEntry(submission as never, photocall as never, 'https://api.example'),
  templates.verifyEmail('Thabo', 'https://bathong.africa/account/verify?token=x'),
  templates.accountExists('https://bathong.africa/account/forgot'),
  templates.joinInstructions('Thabo', { plan: 'annual', amount: 1250, joiningFee: 250, reference: 'BTG-ABC234' }, { accountName: 'Bathong. Collective', bankName: 'Bank', accountNumber: '123', branchCode: '456' }),
  templates.membershipActivated('Thabo', 7, 'monthly', '2026-09-30T04:00:00Z', 'https://bathong.africa/account'),
  templates.editorNewJoin('Thabo', 't@example.org', 'annual', 1250, 'BTG-ABC234', 'https://api.example/admin/collections/orders/1'),
]

describe('email templates', () => {
  it('never carry an em dash', () => {
    for (const mail of every()) {
      expect(mail.subject).not.toMatch(/—/)
      expect(mail.text).not.toMatch(/—/)
    }
  })
  it('sign with the mark and the site', () => {
    for (const mail of every()) {
      if (mail.subject.startsWith('New ')) continue // editor pings end with an admin link
      expect(mail.text.endsWith('BATHONG.\nhttps://bathong.africa')).toBe(true)
    }
  })
  it('use the mark, never the voice, on account mail', () => {
    for (const mail of [templates.verifyEmail('T', 'x'), templates.accountExists('x')]) {
      expect(mail.subject).toContain('Bathong.')
      expect(mail.subject).not.toContain('Bathong!')
      expect(mail.text).toContain('x')
    }
  })
  it('spell out the money and the number on membership mail', () => {
    const join = templates.joinInstructions('T', { plan: 'monthly', amount: 350, joiningFee: 250, reference: 'BTG-XYZ789' }, {})
    expect(join.text).toContain('Amount: R350 (R250 joining fee included)')
    expect(join.text).toContain('Reference: BTG-XYZ789')
    expect(join.text).toContain('Bank details follow')
    const active = templates.membershipActivated('T', 7, 'annual', '2027-08-30T04:00:00Z', 'https://bathong.africa/account')
    expect(active.subject).toBe('Welcome in. Member № 0007')
    expect(active.text).toContain('Runs until: 30 August 2027')
  })
})
