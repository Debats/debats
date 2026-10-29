/** Contributor identity for use case authorization checks */
export type ContributorIdentity = { id: string; reputation: number }

/** Field-level validation errors returned by use cases */
export type FieldErrors = Record<string, string>

/** The failures an aggregate tells (`domain/aggregates/decision.ts`), as the commands pass them on */
export { NotFound, Rejected } from '../aggregates/decision'

/**
 * A form refused on several fields at once, before any command ran: each
 * field at fault carries the message the form shows under it.
 */
export class Invalid {
  readonly _tag = 'Invalid'
  constructor(readonly fields: FieldErrors) {}
}
