/** Contributor identity for use case authorization checks */
export type ContributorIdentity = { id: string; reputation: number }

/** Field-level validation errors returned by use cases */
export type FieldErrors = Record<string, string>

/**
 * A command refused by the domain while it ran against the journal, with the
 * message for the contributor and, when one field of the form is to blame,
 * which one.
 */
export class Rejected {
  readonly _tag = 'Rejected'
  constructor(
    readonly message: string,
    readonly field?: string,
  ) {}
}

/**
 * A form refused on several fields at once, before any command ran: each
 * field at fault carries the message the form shows under it.
 */
export class Invalid {
  readonly _tag = 'Invalid'
  constructor(readonly fields: FieldErrors) {}
}

/**
 * The aggregate a command names is unknown to the journal and the tables, or
 * was deleted: refused before any decision, with the aggregate's own message.
 * A command reaching another aggregate can tell this apart from a refusal.
 */
export class NotFound {
  readonly _tag = 'NotFound'
  constructor(readonly message: string) {}
}
