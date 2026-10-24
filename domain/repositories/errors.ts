export class DatabaseError extends Error {
  readonly _tag = 'DatabaseError'
  constructor(
    message: string,
    /** The infrastructure failure behind it, for the adapters that can tell them apart */
    readonly cause?: unknown,
  ) {
    super(message)
  }
}
