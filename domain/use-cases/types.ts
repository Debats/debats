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
