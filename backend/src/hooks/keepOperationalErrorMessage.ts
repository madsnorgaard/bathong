import type { AfterErrorHook } from 'payload'

const GENERIC = 'An unknown error occurred.'

type PayloadError = Error & {
  data?: unknown
  isOperational?: boolean
  isPublic?: boolean
  status?: number
}

/**
 * Next 16.4 production builds minify server classes, and Payload 3.x error
 * classes take their `name` from `this.constructor.name`, which then comes
 * out empty. `formatErrors` only keeps the message of an error without `data`
 * when `name` is set, so every APIError thrown from a hook or endpoint answers
 * "An unknown error occurred." on the REST API and in the admin toast
 * (payloadcms/payload#18774). The status is still right; only the message is
 * lost. Fixed upstream on the 3.x branch by #18775, not in a release as of
 * 3.91.0.
 *
 * Until that ships, put the message back here, under the same public/private
 * rule as Payload's own routeError (isErrorPublic): a 500 stays generic
 * unless the error says it is public. Remove this hook once payload carries
 * #18775 (and admin-sequence / admin-walk-links / smoke e2e specs stay
 * green without it).
 */
export const keepOperationalErrorMessage: AfterErrorHook = ({ error, req, result }) => {
  // REST only: GraphQL is disabled in this config, so there is no graphqlResult.
  if (!result) return
  const err = error as PayloadError
  if (err.isOperational !== true || err.data || !err.message) return
  const first = result.errors?.[0]
  if (!first || first.message !== GENERIC) return
  const { config } = req.payload
  const isPublic =
    config.debug === true ||
    err.isPublic === true ||
    (err.isPublic !== false && typeof err.status === 'number' && err.status !== 500)
  if (!isPublic) return
  return { response: { ...result, errors: [{ message: err.message }] } }
}
