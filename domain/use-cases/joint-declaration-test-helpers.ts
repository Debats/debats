import { Effect } from 'effect'
import {
  jointDeclarationPublished,
  jointDeclarationStream,
  positionTaken,
  signatoryAdded,
  TakenPosition,
} from '../aggregates/joint-declaration'
import {
  generateJointDeclarationSlug,
  JointDeclaration,
  JointDeclarationId,
  JointDeclarationTitle,
} from '../entities/joint-declaration'
import { Position } from '../entities/position'
import { StatementAuthor } from '../entities/statement'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { JointDeclarationRepository } from '../repositories/joint-declaration-repository'
import { PositionRepository } from '../repositories/position-repository'
import { sameSource } from '../value-objects/source-address'

/** A joint declaration as a fixture, for the tests only: born from its stream on the site */
export const sampleJointDeclaration = (title = 'Le Manifeste de Paris'): JointDeclaration => {
  const now = new Date()
  return JointDeclaration.make({
    id: JointDeclarationId.make(crypto.randomUUID()),
    title: JointDeclarationTitle.make(title),
    slug: generateJointDeclarationSlug(title),
    presentation: "Contre l'oligarchie internationale",
    sourceName: 'Manifeste de Paris',
    sourceUrl: 'https://parismanifesto.world',
    declaredAt: new Date('2026-11-21'),
    createdBy: 'founder',
    updatedBy: 'founder',
    createdAt: now,
    updatedAt: now,
  })
}

/**
 * In-memory joint declaration repository over the given texts. `reached`
 * names, by position or subject id, the texts a merge or a deletion finds.
 */
export function fakeJointDeclarationRepo(
  seed: JointDeclaration[] = [],
  reached: Record<string, string[]> = {},
): JointDeclarationRepository {
  return {
    findAll: () => Effect.succeed(seed),
    findBySlug: (slug) => Effect.succeed(seed.find((d) => d.slug === slug) ?? null),
    findBySourceUrl: (url) =>
      Effect.succeed(seed.find((d) => sameSource(d.sourceUrl, url)) ?? null),
    searchByTitle: () => Effect.succeed(seed),
    findIdsByPositionId: (positionId) => Effect.succeed(reached[positionId] ?? []),
    findIdsBySubjectId: (subjectId) => Effect.succeed(reached[subjectId] ?? []),
  }
}

/** In-memory position repository over the given positions */
export function fakePositionRepo(seed: Position[] = []): PositionRepository {
  return {
    findById: (id) => Effect.succeed(seed.find((p) => p.id === id) ?? null),
    findBySubjectAndSlug: (subjectId, slug) =>
      Effect.succeed(seed.find((p) => p.subjectId === subjectId && p.slug === slug) ?? null),
    findBySubjectId: (subjectId) => Effect.succeed(seed.filter((p) => p.subjectId === subjectId)),
  }
}

/** What a joint declaration's stream holds besides the text: its positions and its signatories */
export interface DeclarationHeld {
  positions?: readonly TakenPosition[]
  signatories?: readonly StatementAuthor[]
}

/** An in-memory journal where these joint declarations already have their streams */
export async function journalWithJointDeclarations(
  ...seed: Array<[JointDeclaration, DeclarationHeld]>
) {
  const unit = inMemoryUnitOfWork()
  for (const [declaration, held] of seed) {
    await Effect.runPromise(
      unit.journal.append(
        jointDeclarationStream(declaration.id),
        0,
        [
          jointDeclarationPublished(declaration),
          ...(held.positions ?? []).map(positionTaken),
          ...(held.signatories ?? []).map(signatoryAdded),
        ],
        { actorId: declaration.createdBy },
      ),
    )
  }
  return unit
}
