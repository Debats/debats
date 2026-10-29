import * as S from 'effect/Schema'
import { slugify } from '../value-objects/slug'
import { OccupationFamilyId } from './occupation-family'

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
 * from a closed list the Idéalistes curate, each within a family. A figure can
 * hold several, with no hierarchy among them; statistics by family read from
 * this link.
 */
export const Occupation = S.Struct({
  id: OccupationId,
  name: OccupationName,
  slug: OccupationSlug,
  familyId: OccupationFamilyId,
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

/**
 * How a written name may be spelt to still designate the listed occupation:
 * « Député·e » is also written « Député », as dropping the inclusive suffix is
 * the one variation worth accepting. Case and accents are already ignored by
 * the slug. Everything else must match the listed name.
 */
const spellingsOf = (name: string): string[] => [slugify(name), slugify(name.replace(/·\S*/g, ''))]

/** Whether a written name designates this listed occupation. */
export const sameOccupationName = (written: string, listed: string): boolean => {
  const candidate = slugify(written)
  return spellingsOf(listed).some((spelling) => spelling === candidate)
}
