/** Contributor identity for use case authorization checks */
export type ContributorIdentity = { id: string; reputation: number }

/** Field-level validation errors returned by use cases */
export type FieldErrors = Record<string, string>
