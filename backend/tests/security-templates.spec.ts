import { describe, expect, it } from 'vitest'
import * as templates from '../src/email/templates'

const mails = [
  templates.emailChangeVerify('Thabo', 'https://bathong.africa/account/verify?kind=email&token=x'),
  templates.emailChangeNotice('Thabo', 'new@example.org', 'hello@bathong.africa'),
  templates.passwordChanged('Thabo', 'hello@bathong.africa'),
  templates.accountDeleted('Thabo'),
]

describe('security mails', () => {
  it('carry the mark, the signature and no em dash', () => {
    for (const mail of mails) {
      expect(mail.subject).toContain('Bathong.')
      expect(mail.text).toContain('BATHONG.\nhttps://bathong.africa')
      expect(mail.subject + mail.text).not.toContain('—')
    }
  })
  it('say what to do when it was not you', () => {
    expect(templates.emailChangeNotice('T', 'n@x.org', 'c@x.org').text).toMatch(/not you/)
    expect(templates.passwordChanged('T', 'c@x.org').text).toMatch(/not you/)
    expect(templates.emailChangeVerify('T', 'https://x').text).toContain('https://x')
  })
})
