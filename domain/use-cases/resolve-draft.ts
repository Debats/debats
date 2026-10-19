import { Effect, pipe } from 'effect'
import { DraftStatement } from '../entities/draft-statement'
import { generateSlug as generatePublicFigureSlug } from '../entities/public-figure'
import { generateOrganisationSlug } from '../entities/organisation'
import { sameOccupationName } from '../entities/occupation'
import { generateSlug as generateSubjectSlug } from '../entities/subject'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { PositionRepository } from '../repositories/position-repository'
import { ArgumentRepository } from '../repositories/argument-repository'
import { OccupationRepository } from '../repositories/occupation-repository'
import { DatabaseError } from '../repositories/errors'

type FoundEntity<T> = { found: true; entity: T }
type NotFoundEntity = { found: false; canCreate: boolean }
export type ResolvedEntity<T> = FoundEntity<T> | NotFoundEntity

type Named = { id: string; name: string; slug: string }

export type ResolvedAuthor = ResolvedEntity<Named>

/** An argument the draft mobilises, and whether the site already has it */
export type ResolvedArgument = {
  title: string
  description?: string
  known: boolean
}

/** An occupation the draft gives its author, and whether it is on the closed list */
export type ResolvedOccupation = {
  name: string
  current: boolean
  listed: boolean
}

/** An organisation the draft affiliates its author to */
export type ResolvedAffiliation = {
  organisation: string
  role?: string
  startedOn?: string
  endedOn?: string
  found: boolean
  canCreate: boolean
}

export type DraftResolution = {
  author: ResolvedAuthor
  subject: ResolvedEntity<{ id: string; title: string; slug: string }>
  position: ResolvedEntity<{ id: string; title: string }>
  arguments: ResolvedArgument[]
  occupations: ResolvedOccupation[]
  affiliations: ResolvedAffiliation[]
  canValidate: boolean
}

function resolveAuthor(
  draft: DraftStatement,
  repos: {
    publicFigureRepo: PublicFigureRepository
    organisationRepo: OrganisationRepository
  },
): Effect.Effect<ResolvedAuthor, DatabaseError> {
  const { author } = draft

  /** Figures and organisations share the shape the resolution exposes. */
  const named = (entity: { id: string; name: string; slug: string } | null) =>
    entity ? { id: entity.id, name: entity.name, slug: entity.slug } : null

  const lookup: Effect.Effect<Named | null, DatabaseError> =
    author.kind === 'public_figure'
      ? pipe(
          repos.publicFigureRepo.findBySlug(generatePublicFigureSlug(author.name)),
          Effect.map(named),
        )
      : pipe(
          repos.organisationRepo.findBySlug(generateOrganisationSlug(author.name)),
          Effect.map(named),
        )

  return pipe(
    lookup,
    Effect.map((entity) =>
      entity
        ? { found: true as const, entity }
        : { found: false as const, canCreate: author.data !== null },
    ),
  )
}

function resolveSubject(
  draft: DraftStatement,
  repo: SubjectRepository,
): Effect.Effect<DraftResolution['subject'], DatabaseError> {
  return pipe(
    repo.findBySlug(generateSubjectSlug(draft.subjectTitle)),
    Effect.map((subject) =>
      subject
        ? {
            found: true as const,
            entity: { id: subject.id, title: subject.title, slug: subject.slug },
          }
        : { found: false as const, canCreate: draft.subjectData !== null },
    ),
  )
}

function resolvePosition(
  draft: DraftStatement,
  subjectResolution: DraftResolution['subject'],
  repo: PositionRepository,
): Effect.Effect<DraftResolution['position'], DatabaseError> {
  if (!subjectResolution.found) {
    return Effect.succeed({
      found: false as const,
      canCreate: subjectResolution.canCreate && draft.positionData !== null,
    })
  }
  return pipe(
    repo.findBySubjectId(subjectResolution.entity.id),
    Effect.map((positions) => {
      const match = positions.find((p) => p.title === draft.positionTitle)
      return match
        ? { found: true as const, entity: { id: match.id, title: match.title } }
        : { found: false as const, canCreate: draft.positionData !== null }
    }),
  )
}

/** An argument is known by its title, which is unique across the whole site. */
function resolveArguments(
  draft: DraftStatement,
  repo: ArgumentRepository,
): Effect.Effect<ResolvedArgument[], DatabaseError> {
  return Effect.all(
    draft.arguments.map((argument) =>
      pipe(
        repo.findByTitle(argument.title),
        Effect.map((known): ResolvedArgument => ({ ...argument, known: known !== null })),
      ),
    ),
  )
}

function resolveOccupations(
  draft: DraftStatement,
  repo: OccupationRepository,
): Effect.Effect<ResolvedOccupation[], DatabaseError> {
  if (draft.occupations.length === 0) return Effect.succeed([])
  return pipe(
    repo.findAll(),
    Effect.map((listed) =>
      draft.occupations.map(
        (occupation): ResolvedOccupation => ({
          ...occupation,
          listed: listed.some((candidate) => sameOccupationName(occupation.name, candidate.name)),
        }),
      ),
    ),
  )
}

function resolveAffiliations(
  draft: DraftStatement,
  repo: OrganisationRepository,
): Effect.Effect<ResolvedAffiliation[], DatabaseError> {
  return Effect.all(
    draft.affiliations.map((affiliation) =>
      pipe(
        repo.findBySlug(generateOrganisationSlug(affiliation.organisation)),
        Effect.map(
          (organisation): ResolvedAffiliation => ({
            organisation: affiliation.organisation,
            role: affiliation.role,
            startedOn: affiliation.startedOn,
            endedOn: affiliation.endedOn,
            found: organisation !== null,
            canCreate: affiliation.organisationData !== undefined,
          }),
        ),
      ),
    ),
  )
}

export function resolveDraft(
  draft: DraftStatement,
  repos: {
    publicFigureRepo: PublicFigureRepository
    organisationRepo: OrganisationRepository
    subjectRepo: SubjectRepository
    positionRepo: PositionRepository
    argumentRepo: ArgumentRepository
    occupationRepo: OccupationRepository
  },
): Effect.Effect<DraftResolution, DatabaseError> {
  return pipe(
    Effect.all({
      author: resolveAuthor(draft, repos),
      subject: resolveSubject(draft, repos.subjectRepo),
      draftArguments: resolveArguments(draft, repos.argumentRepo),
      occupations: resolveOccupations(draft, repos.occupationRepo),
      affiliations: resolveAffiliations(draft, repos.organisationRepo),
    }),
    Effect.flatMap(({ author, subject, draftArguments, occupations, affiliations }) =>
      Effect.map(resolvePosition(draft, subject, repos.positionRepo), (position) => ({
        author,
        subject,
        position,
        arguments: draftArguments,
        occupations,
        affiliations,
        canValidate:
          [author, subject, position].every((r) => r.found || (!r.found && r.canCreate)) &&
          occupations.every((o) => o.listed) &&
          affiliations.every((a) => a.found || a.canCreate),
      })),
    ),
  )
}
