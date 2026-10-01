import { Effect, pipe } from 'effect'
import { DraftStatement } from '../entities/draft-statement'
import { generateSlug as generatePublicFigureSlug } from '../entities/public-figure'
import { generateOrganisationSlug } from '../entities/organisation'
import { generateSlug as generateSubjectSlug } from '../entities/subject'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { PositionRepository } from '../repositories/position-repository'
import { DatabaseError } from '../repositories/errors'

type FoundEntity<T> = { found: true; entity: T }
type NotFoundEntity = { found: false; canCreate: boolean }
export type ResolvedEntity<T> = FoundEntity<T> | NotFoundEntity

type Named = { id: string; name: string; slug: string }

export type ResolvedAuthor = ResolvedEntity<Named>

export type DraftResolution = {
  author: ResolvedAuthor
  subject: ResolvedEntity<{ id: string; title: string; slug: string }>
  position: ResolvedEntity<{ id: string; title: string }>
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

export function resolveDraft(
  draft: DraftStatement,
  repos: {
    publicFigureRepo: PublicFigureRepository
    organisationRepo: OrganisationRepository
    subjectRepo: SubjectRepository
    positionRepo: PositionRepository
  },
): Effect.Effect<DraftResolution, DatabaseError> {
  return pipe(
    Effect.all({
      author: resolveAuthor(draft, repos),
      subject: resolveSubject(draft, repos.subjectRepo),
    }),
    Effect.flatMap(({ author, subject }) =>
      Effect.map(resolvePosition(draft, subject, repos.positionRepo), (position) => ({
        author,
        subject,
        position,
        canValidate: [author, subject, position].every((r) => r.found || (!r.found && r.canCreate)),
      })),
    ),
  )
}
