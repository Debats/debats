import { Option } from 'effect'
import { Argument, ArgumentId, ArgumentTitle, generateArgumentSlug } from './argument'
import { Invitation, InvitationId, InviteeEmail, InviteeName } from './invitation'
import { Occupation, OccupationId, OccupationName, generateOccupationSlug } from './occupation'
import {
  generateOccupationFamilySlug,
  OccupationFamily,
  OccupationFamilyId,
  OccupationFamilyName,
} from './occupation-family'
import {
  generateOrganisationSlug,
  Organisation,
  OrganisationId,
  OrganisationName,
  OrganisationType,
} from './organisation'
import { MembershipId, OrganisationMembership } from './organisation-membership'
import {
  generateSlug as generatePositionSlug,
  Position,
  PositionId,
  PositionTitle,
} from './position'
import {
  generateSlug as generatePublicFigureSlug,
  PublicFigure,
  PublicFigureId,
  PublicFigureName,
} from './public-figure'
import { Statement, StatementAuthor, StatementContent, StatementId } from './statement'
import { generateSlug as generateSubjectSlug, Subject, SubjectId, SubjectTitle } from './subject'
import { generateThemeSlug, Theme, ThemeId, ThemeName } from './theme'

/**
 * Entities as fixtures, for the tests only: a fresh id, dated now, validated
 * by the entity's schema. The site creates nothing this way: an entity is
 * born from the facts of its stream (`domain/aggregates`).
 */

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
    slug: generateSubjectSlug(params.title),
    presentation: params.presentation,
    problem: params.problem,
    pictureUrl: params.pictureUrl,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

export const createPosition = (params: {
  title: string
  description: string
  subjectId: string
  createdBy?: string
}): Position => {
  const now = new Date()
  return Position.make({
    id: PositionId.make(crypto.randomUUID()),
    title: PositionTitle.make(params.title),
    slug: generatePositionSlug(params.title),
    description: params.description,
    subjectId: params.subjectId,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

export const createStatement = (params: {
  author: StatementAuthor
  positionId: string
  content: StatementContent
  sourceName: string
  sourceUrl: string
  statedAt: Date
  createdBy?: string
}): Statement => {
  const now = new Date()
  return Statement.make({
    id: StatementId.make(crypto.randomUUID()),
    author: params.author,
    positionId: params.positionId,
    content: params.content,
    sourceName: params.sourceName,
    sourceUrl: params.sourceUrl,
    statedAt: params.statedAt,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

export const createPublicFigure = (params: {
  name: string
  presentation: string
  wikipediaUrl?: string
  notorietySources?: string[]
  websiteUrl?: string
  createdBy: string
}): PublicFigure => {
  const now = new Date()
  return PublicFigure.make({
    id: PublicFigureId.make(crypto.randomUUID()),
    name: PublicFigureName.make(params.name),
    slug: generatePublicFigureSlug(params.name),
    presentation: params.presentation,
    wikipediaUrl: Option.fromNullable(params.wikipediaUrl || undefined),
    notorietySources: params.notorietySources ?? [],
    websiteUrl: Option.fromNullable(params.websiteUrl || undefined),
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

const optionalText = (value: string | undefined): Option.Option<string> => {
  const trimmed = value?.trim()
  return trimmed ? Option.some(trimmed) : Option.none()
}

export const createOrganisation = (params: {
  name: string
  acronym?: string
  organisationType: OrganisationType
  presentation: string
  wikipediaUrl?: string
  websiteUrl?: string
  notorietySources?: string[]
  createdBy: string
}): Organisation => {
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

export const createMembership = (params: {
  organisationId: string
  publicFigureId: string
  role?: string
  startedOn?: Date
  endedOn?: Date
  createdBy: string
}): OrganisationMembership => {
  const now = new Date()
  const role = params.role?.trim() ?? ''
  return OrganisationMembership.make({
    id: MembershipId.make(crypto.randomUUID()),
    organisationId: params.organisationId,
    publicFigureId: params.publicFigureId,
    role: role ? Option.some(role) : Option.none(),
    startedOn: Option.fromNullable(params.startedOn),
    endedOn: Option.fromNullable(params.endedOn),
    createdBy: params.createdBy,
    updatedBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

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

export const createTheme = (params: {
  name: string
  description: string
  createdBy: string
}): Theme => {
  const now = new Date()
  return Theme.make({
    id: ThemeId.make(crypto.randomUUID()),
    name: ThemeName.make(params.name),
    slug: generateThemeSlug(params.name),
    description: params.description,
    createdBy: params.createdBy,
    updatedBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

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

export const createOccupation = (params: {
  name: string
  familyId: string
  description?: string
  createdBy: string
}): Occupation => {
  const now = new Date()
  const name = params.name.trim()
  return Occupation.make({
    id: OccupationId.make(crypto.randomUUID()),
    name: OccupationName.make(name),
    slug: generateOccupationSlug(name),
    familyId: OccupationFamilyId.make(params.familyId),
    description: params.description?.trim() ?? '',
    createdBy: params.createdBy,
    updatedBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

export const createInvitation = (params: {
  inviterId: string
  inviteeEmail: string
  inviteeName: string
}): Invitation => {
  const now = new Date()
  return Invitation.make({
    id: InvitationId.make(crypto.randomUUID()),
    inviterId: params.inviterId,
    inviteeEmail: InviteeEmail.make(params.inviteeEmail),
    inviteeName: InviteeName.make(params.inviteeName),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  })
}
