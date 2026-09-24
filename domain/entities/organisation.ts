import * as S from 'effect/Schema'
import { Option } from 'effect'
import { slugify } from '../value-objects/slug'

export const OrganisationId = S.String.pipe(S.brand('OrganisationId'))
export type OrganisationId = S.Schema.Type<typeof OrganisationId>

export const OrganisationSlug = S.String.pipe(
  S.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  S.brand('OrganisationSlug'),
)
export type OrganisationSlug = S.Schema.Type<typeof OrganisationSlug>

export const OrganisationName = S.String.pipe(
  S.minLength(2),
  S.maxLength(150),
  S.brand('OrganisationName'),
)
export type OrganisationName = S.Schema.Type<typeof OrganisationName>

export const ORGANISATION_TYPES = [
  'political_party',
  'ngo',
  'union',
  'company',
  'lobby',
  'business_group',
  'association',
  'collective',
] as const
export type OrganisationType = (typeof ORGANISATION_TYPES)[number]

export const ORGANISATION_TYPE_LABELS: Record<OrganisationType, string> = {
  political_party: 'Parti politique',
  ngo: 'ONG',
  union: 'Syndicat',
  company: 'Entreprise',
  lobby: 'Lobby',
  business_group: 'Groupement économique',
  association: 'Association',
  collective: 'Collectif',
}

export const ORGANISATION_TYPE_PLURAL_LABELS: Record<OrganisationType, string> = {
  political_party: 'Partis politiques',
  ngo: 'ONG',
  union: 'Syndicats',
  company: 'Entreprises',
  lobby: 'Lobbies',
  business_group: 'Groupements économiques',
  association: 'Associations',
  collective: 'Collectifs',
}

/** Returns the organisation type when the value is a known one, null otherwise. */
export function parseOrganisationType(value: unknown): OrganisationType | null {
  const str = String(value ?? '')
  return ORGANISATION_TYPES.includes(str as OrganisationType) ? (str as OrganisationType) : null
}

export const Organisation = S.Struct({
  id: OrganisationId,
  name: OrganisationName,
  slug: OrganisationSlug,
  acronym: S.Option(S.String.pipe(S.maxLength(30))),
  organisationType: S.Literal(...ORGANISATION_TYPES),
  presentation: S.String.pipe(S.minLength(10)),
  wikipediaUrl: S.Option(S.String),
  websiteUrl: S.Option(S.String),
  notorietySources: S.Array(S.String),
  createdBy: S.String,
  updatedBy: S.String,
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type Organisation = S.Schema.Type<typeof Organisation>

export const generateOrganisationSlug = (name: string): OrganisationSlug =>
  OrganisationSlug.make(slugify(name))

const optionalText = (value: string | undefined): Option.Option<string> => {
  const trimmed = value?.trim() ?? ''
  return trimmed ? Option.some(trimmed) : Option.none()
}

export interface OrganisationFields {
  name: string
  acronym?: string
  organisationType: OrganisationType
  presentation: string
  wikipediaUrl?: string
  websiteUrl?: string
  notorietySources?: string[]
}

export const createOrganisation = (
  params: OrganisationFields & { createdBy: string },
): Organisation => {
  const now = new Date()

  return Organisation.make({
    id: OrganisationId.make(crypto.randomUUID()),
    name: OrganisationName.make(params.name),
    slug: generateOrganisationSlug(params.name),
    acronym: optionalText(params.acronym),
    organisationType: params.organisationType,
    presentation: params.presentation,
    wikipediaUrl: optionalText(params.wikipediaUrl),
    websiteUrl: optionalText(params.websiteUrl),
    notorietySources: params.notorietySources ?? [],
    createdBy: params.createdBy,
    updatedBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

export const updateOrganisation = (
  organisation: Organisation,
  params: OrganisationFields & { updatedBy: string },
): Organisation =>
  Organisation.make({
    ...organisation,
    name: OrganisationName.make(params.name),
    slug: generateOrganisationSlug(params.name),
    acronym: optionalText(params.acronym),
    organisationType: params.organisationType,
    presentation: params.presentation,
    wikipediaUrl: optionalText(params.wikipediaUrl),
    websiteUrl: optionalText(params.websiteUrl),
    notorietySources: params.notorietySources ?? [],
    updatedBy: params.updatedBy,
    updatedAt: new Date(),
  })
