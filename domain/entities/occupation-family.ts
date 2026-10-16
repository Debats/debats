import * as S from 'effect/Schema'
import { slugify } from '../value-objects/slug'

export const OccupationFamilyId = S.String.pipe(S.brand('OccupationFamilyId'))
export type OccupationFamilyId = S.Schema.Type<typeof OccupationFamilyId>

export const OccupationFamilySlug = S.String.pipe(
  S.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  S.brand('OccupationFamilySlug'),
)
export type OccupationFamilySlug = S.Schema.Type<typeof OccupationFamilySlug>

export const OccupationFamilyName = S.String.pipe(
  S.minLength(2),
  S.maxLength(50),
  S.brand('OccupationFamilyName'),
)
export type OccupationFamilyName = S.Schema.Type<typeof OccupationFamilyName>

/**
 * The upper level of the occupations taxonomy (« Exécutif », « Syndicaliste »):
 * statistics are read at this level, occupations give the detail.
 */
export const OccupationFamily = S.Struct({
  id: OccupationFamilyId,
  name: OccupationFamilyName,
  slug: OccupationFamilySlug,
  description: S.String,
  /** Display order; families have a natural order rather than an alphabetical one */
  position: S.Number,
  createdBy: S.String,
  updatedBy: S.String,
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type OccupationFamily = S.Schema.Type<typeof OccupationFamily>

export const generateOccupationFamilySlug = (name: string): OccupationFamilySlug =>
  OccupationFamilySlug.make(slugify(name))

export const createOccupationFamily = (params: {
  name: string
  description?: string
  position: number
  createdBy: string
}): OccupationFamily => {
  const now = new Date()
  const name = params.name.trim()

  return OccupationFamily.make({
    id: OccupationFamilyId.make(crypto.randomUUID()),
    name: OccupationFamilyName.make(name),
    slug: generateOccupationFamilySlug(name),
    description: params.description?.trim() ?? '',
    position: params.position,
    createdBy: params.createdBy,
    updatedBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}
