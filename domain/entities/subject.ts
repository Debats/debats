import { pipe } from 'effect'
import * as S from 'effect/Schema'
import { isAfter, subDays } from 'date-fns/fp'

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

export const generateSlug = (title: string): SubjectSlug =>
  pipe(
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, ''),
    SubjectSlug.make,
  )

export const createSubject = (params: {
  title: string
  presentation: string
  problem: string
  pictureUrl?: string
  createdBy?: string
}): Subject => {
  const now = new Date()

  return Subject.make({
    id: SubjectId.make(crypto.randomUUID()),
    title: SubjectTitle.make(params.title),
    slug: generateSlug(params.title),
    presentation: params.presentation,
    problem: params.problem,
    pictureUrl: params.pictureUrl,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

export const isMajorSubject = (subject: Subject, statementCount = 0): boolean => {
  const oneWeekAgo = subDays(7)(new Date())
  return isAfter(oneWeekAgo)(subject.createdAt) || statementCount > 5
}

export const updateSubjectTitle = (subject: Subject, newTitle: string): Subject => ({
  ...subject,
  title: SubjectTitle.make(newTitle),
  slug: generateSlug(newTitle),
  updatedAt: new Date(),
})

export const updateSubjectPresentation = (subject: Subject, newPresentation: string): Subject => ({
  ...subject,
  presentation: newPresentation,
  updatedAt: new Date(),
})
