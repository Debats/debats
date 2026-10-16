import * as S from 'effect/Schema'
import { slugify } from '../value-objects/slug'

export const OccupationId = S.String.pipe(S.brand('OccupationId'))
export type OccupationId = S.Schema.Type<typeof OccupationId>

export const OccupationSlug = S.String.pipe(
  S.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  S.brand('OccupationSlug'),
)
export type OccupationSlug = S.Schema.Type<typeof OccupationSlug>

export const OccupationName = S.String.pipe(
  S.minLength(2),
  S.maxLength(50),
  S.brand('OccupationName'),
)
export type OccupationName = S.Schema.Type<typeof OccupationName>

/**
 * A profession or public function a figure holds (« Député·e », « Économiste »),
 * from a closed list the Idéalistes curate. A figure can hold several, with no
 * hierarchy among them; statistics by occupation read from this link.
 */
export const Occupation = S.Struct({
  id: OccupationId,
  name: OccupationName,
  slug: OccupationSlug,
  /** Optional: what the occupation covers, to tell close ones apart */
  description: S.String,
  createdBy: S.String,
  updatedBy: S.String,
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type Occupation = S.Schema.Type<typeof Occupation>

export const generateOccupationSlug = (name: string): OccupationSlug =>
  OccupationSlug.make(slugify(name))

export const createOccupation = (params: {
  name: string
  description?: string
  createdBy: string
}): Occupation => {
  const now = new Date()
  const name = params.name.trim()

  return Occupation.make({
    id: OccupationId.make(crypto.randomUUID()),
    name: OccupationName.make(name),
    slug: generateOccupationSlug(name),
    description: params.description?.trim() ?? '',
    createdBy: params.createdBy,
    updatedBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}
