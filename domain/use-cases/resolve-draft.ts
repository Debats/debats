import { Effect, pipe } from 'effect'
import { DraftStatement } from '../entities/draft-statement'
import { generateSlug as generatePublicFigureSlug } from '../entities/public-figure'
import { generateSlug as generateSubjectSlug } from '../entities/subject'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { PositionRepository } from '../repositories/position-repository'
import { DatabaseError } from '../repositories/errors'

type FoundEntity<T> = { found: true; entity: T }
type NotFoundEntity = { found: false; canCreate: boolean }
export type ResolvedEntity<T> = FoundEntity<T> | NotFoundEntity

export type DraftResolution = {
  publicFigure: ResolvedEntity<{ id: string; name: string; slug: string }>
  subject: ResolvedEntity<{ id: string; title: string; slug: string }>
  position: ResolvedEntity<{ id: string; title: string }>
  canValidate: boolean
}

function resolvePublicFigure(
  draft: DraftStatement,
  repo: PublicFigureRepository,
): Effect.Effect<DraftResolution['publicFigure'], DatabaseError> {
  return pipe(
    repo.findBySlug(generatePublicFigureSlug(draft.publicFigureName)),
    Effect.map((figure) =>
      figure
        ? { found: true as const, entity: { id: figure.id, name: figure.name, slug: figure.slug } }
        : { found: false as const, canCreate: draft.publicFigureData !== null },
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
    subjectRepo: SubjectRepository
    positionRepo: PositionRepository
  },
): Effect.Effect<DraftResolution, DatabaseError> {
  return pipe(
    Effect.all({
      publicFigure: resolvePublicFigure(draft, repos.publicFigureRepo),
      subject: resolveSubject(draft, repos.subjectRepo),
    }),
    Effect.flatMap(({ publicFigure, subject }) =>
      Effect.map(resolvePosition(draft, subject, repos.positionRepo), (position) => ({
        publicFigure,
        subject,
        position,
        canValidate: [publicFigure, subject, position].every(
          (r) => r.found || (!r.found && r.canCreate),
        ),
      })),
    ),
  )
}
