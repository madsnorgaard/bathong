/**
 * What a closed account leaves behind. RSVPs and entries keep their row
 * (the walk had a place taken, the call had an entry) under a name that
 * names nobody and an address that cannot deliver.
 */
export const FORMER_MEMBER = 'Former member'

export const anonymisedEmail = (id: number | string) => `deleted-${id}@example.invalid`
