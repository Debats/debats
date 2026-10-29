import * as S from 'effect/Schema'
import { isAfter, subDays } from 'date-fns/fp'
import { slugify } from '../value-objects/slug'

export const SubjectId = S.String.pipe(S.brand('SubjectId'))
export type SubjectId = S.Schema.Type<typeof SubjectId>

export const SubjectSlug = S.String.pipe(
  S.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  S.brand('SubjectSlug'),
)
export type SubjectSlug = S.Schema.Type<typeof SubjectSlug>

export const SubjectTitle = S.String.pipe(S.minLength(3), S.maxLength(100), S.brand('SubjectTitle'))
export type SubjectTitle = S.Schema.Type<typeof SubjectTitle>

export const Subject = S.Struct({
  id: SubjectId,
  title: SubjectTitle,
  slug: SubjectSlug,
  presentation: S.String.pipe(S.minLength(10)),
  problem: S.String.pipe(S.minLength(10)),
  pictureUrl: S.optional(S.String),
  createdBy: S.optional(S.String),
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type Subject = S.Schema.Type<typeof Subject>

export const generateSlug = (title: string): SubjectSlug => SubjectSlug.make(slugify(title))

/** A subject is major while it is less than a week old, or once it gathers more than five statements */
export const isMajorSubject = (
  subject: Subject,
  statementCount = 0,
  today: Date = new Date(),
): boolean => {
  const oneWeekAgo = subDays(7)(today)
  return isAfter(oneWeekAgo)(subject.createdAt) || statementCount > 5
}
