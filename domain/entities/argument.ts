import * as S from 'effect/Schema'

export const ArgumentId = S.String.pipe(S.brand('ArgumentId'))
export type ArgumentId = S.Schema.Type<typeof ArgumentId>

export const ArgumentTitle = S.String.pipe(
  S.minLength(3),
  S.maxLength(255),
  S.brand('ArgumentTitle'),
)
export type ArgumentTitle = S.Schema.Type<typeof ArgumentTitle>

/**
 * A line of reasoning used in a debate. It belongs to the subject, not to a
 * position: which positions it serves is read from the statements that
 * mobilise it, and one used on both sides is a polarising argument.
 */
export const Argument = S.Struct({
  id: ArgumentId,
  subjectId: S.String,
  title: ArgumentTitle,
  description: S.String.pipe(S.minLength(10)),
  createdBy: S.String,
  updatedBy: S.String,
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type Argument = S.Schema.Type<typeof Argument>

export const createArgument = (params: {
  subjectId: string
  title: string
  description: string
  createdBy: string
}): Argument => {
  const now = new Date()

  return Argument.make({
    id: ArgumentId.make(crypto.randomUUID()),
    subjectId: params.subjectId,
    title: ArgumentTitle.make(params.title.trim()),
    description: params.description.trim(),
    createdBy: params.createdBy,
    updatedBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

/** Two titles name the same argument when they only differ by case or spacing */
export const sameArgumentTitle = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase()
