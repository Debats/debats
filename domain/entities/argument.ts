import * as S from 'effect/Schema'
import { slugify } from '../value-objects/slug'

export const ArgumentId = S.String.pipe(S.brand('ArgumentId'))
export type ArgumentId = S.Schema.Type<typeof ArgumentId>

export const ArgumentSlug = S.String.pipe(
  S.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  S.brand('ArgumentSlug'),
)
export type ArgumentSlug = S.Schema.Type<typeof ArgumentSlug>

export const ArgumentTitle = S.String.pipe(
  S.minLength(3),
  S.maxLength(255),
  S.brand('ArgumentTitle'),
)
export type ArgumentTitle = S.Schema.Type<typeof ArgumentTitle>

/**
 * A line of reasoning used in public debate, shared by the whole site like a
 * tag: « Dignité de la personne » mobilised on two subjects is one argument.
 * Which subjects and positions it serves is read from the statements that
 * mobilise it; one used on several positions of a subject is polarising there.
 */
export const Argument = S.Struct({
  id: ArgumentId,
  title: ArgumentTitle,
  slug: ArgumentSlug,
  /** Optional: a sentence to tell close arguments apart */
  description: S.String,
  createdBy: S.String,
  updatedBy: S.String,
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type Argument = S.Schema.Type<typeof Argument>

export const generateArgumentSlug = (title: string): ArgumentSlug =>
  ArgumentSlug.make(slugify(title))

export const createArgument = (params: {
  title: string
  description?: string
  createdBy: string
}): Argument => {
  const now = new Date()
  const title = params.title.trim()

  return Argument.make({
    id: ArgumentId.make(crypto.randomUUID()),
    title: ArgumentTitle.make(title),
    slug: generateArgumentSlug(title),
    description: params.description?.trim() ?? '',
    createdBy: params.createdBy,
    updatedBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

/** A renamed argument keeps its identity and links; its slug follows the title */
export const renameArgument = (
  argument: Argument,
  params: { title: string; description: string; updatedBy: string },
): Argument => {
  const title = params.title.trim()
  return Argument.make({
    ...argument,
    title: ArgumentTitle.make(title),
    slug: generateArgumentSlug(title),
    description: params.description.trim(),
    updatedBy: params.updatedBy,
    updatedAt: new Date(),
  })
}

/** Two titles name the same argument when they only differ by case or spacing */
export const sameArgumentTitle = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase()
