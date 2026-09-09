import type { FilterOptions, PayloadRequest } from 'payload'
import { APIError } from 'payload'

/**
 * Essays, frames and albums link to events that have already happened: the
 * walk or workshop produces the work, never the other way round. The admin
 * picker only offers events that have started (it constrains only `date`, so
 * it works for walks and workshops alike; Payload re-checks filterOptions on
 * save), and the hook below gives the readable error for the API path.
 */
export const pastWalksOnly: FilterOptions = () => ({
  date: { less_than: new Date().toISOString() },
})

type EventRef = number | string | { id: number | string } | null | undefined

/** Every linked event must exist and have a start date in the past. */
export async function assertEventsInPast(
  collection: 'walks' | 'workshops',
  value: EventRef | EventRef[],
  req: PayloadRequest,
  label: string,
  noun: string,
): Promise<void> {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value]
  const ids = [
    ...new Set(
      raw
        .map((v) => (typeof v === 'object' && v ? v.id : v))
        .filter((v): v is number | string => v !== null && v !== undefined && v !== ''),
    ),
  ]
  if (!ids.length) return

  const { docs } = await req.payload.find({
    collection,
    where: { id: { in: ids } },
    depth: 0,
    pagination: false,
    req,
  })
  const now = Date.now()
  const future = docs.filter((w) => !w.date || new Date(w.date).getTime() >= now)
  if (docs.length !== ids.length || future.length) {
    throw new APIError(
      `A${/^[aeiou]/i.test(label) ? 'n' : ''} ${label} can only be linked to a ${noun} that has already happened.`,
      400,
    )
  }
}

export async function assertWalksInPast(
  value: EventRef | EventRef[],
  req: PayloadRequest,
  label: string,
): Promise<void> {
  return assertEventsInPast('walks', value, req, label, 'walk')
}
