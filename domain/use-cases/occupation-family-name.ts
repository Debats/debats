import * as S from 'effect/Schema'
import { OccupationFamilyName } from '../entities/occupation-family'
import { slugify } from '../value-objects/slug'

/** What a family name must be, whether the family is created or renamed */

export const FAMILY_NAME_TAKEN = 'Une famille porte déjà ce nom.'

/**
 * A family name as a form sends it. The spaces around it mean nothing; its
 * length is the entity's; and it must hold a letter or a digit, since the
 * address of the family is drawn from it: « ·· » names nothing a slug can say.
 */
export const FamilyNameInput = S.compose(S.Trim, OccupationFamilyName).pipe(
  S.filter((name) => slugify(name) !== ''),
)

export const FAMILY_NAME_INVALID =
  'Le nom doit faire entre 2 et 50 caractères et contenir une lettre ou un chiffre.'
