/**
 * Brand content rules enforced in one place (design-system rules):
 * honest placeholders ("R -", "TBC"), the № walk index, "04 / 12" frame
 * numbering. Never invent a number or a date.
 */

/** null/undefined price renders the honest placeholder, 0 renders "Free". */
export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'R -'
  if (amount === 0) return 'Free'
  return `R ${amount}`
}

const SAST = 'Africa/Johannesburg'

/** "Saturday 29 August 2026" in SAST, or "TBC" when the date is not set. */
export function formatWalkDate(iso: string | null | undefined): string {
  if (!iso) return 'TBC'
  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: SAST,
  }).format(new Date(iso))
}

/** "05:30" in SAST, or "TBC". */
export function formatWalkTime(iso: string | null | undefined): string {
  if (!iso) return 'TBC'
  return new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: SAST,
  }).format(new Date(iso))
}

/** "Sat 29 Aug" for the compact home block. */
export function formatWalkDateShort(iso: string | null | undefined): string {
  if (!iso) return 'TBC'
  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: SAST,
  }).format(new Date(iso))
}

/** Walks are numbered "№ 001". */
export function walkNumber(n: number): string {
  return `№ ${String(n).padStart(3, '0')}`
}

/** Frames are numbered "04 / 12". */
export function frameIndex(i: number, total: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(i)} / ${pad(total)}`
}

/** Section heads carry an archive index: "02 /". */
export function sectionIndex(n: number): string {
  return `${String(n).padStart(2, '0')} /`
}
