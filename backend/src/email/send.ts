import type { PayloadRequest } from 'payload'

/**
 * All programmatic mail goes through here. sendSafe never throws and is
 * never awaited on public request paths: a slow or flaky SMTP hop must not
 * fail (or delay) an RSVP or photocall POST that has already committed.
 * Without SMTP_HOST configured Payload console-logs the message instead
 * (local dev, e2e).
 */
export const sendSafe = (
  req: PayloadRequest,
  message: { to: string; subject: string; text: string; replyTo?: string },
): void => {
  void req.payload
    .sendEmail(message)
    .catch((err: unknown) => {
      req.payload.logger.error(
        { err, to: message.to, subject: message.subject },
        'email send failed',
      )
    })
}

/**
 * The collective's shared address: recipient for editor pings, reply-to on
 * visitor mail. site-settings.contactEmail is optional text, and a failed
 * global read must not kill a hook - hence the hard fallback.
 */
export const getContactEmail = async (req: PayloadRequest): Promise<string> => {
  try {
    const settings = await req.payload.findGlobal({ slug: 'site-settings', depth: 0, req })
    return (settings?.contactEmail as string | undefined) || 'hello@bathong.africa'
  } catch {
    return 'hello@bathong.africa'
  }
}
