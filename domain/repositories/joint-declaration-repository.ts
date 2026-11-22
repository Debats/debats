import { Context, Effect } from 'effect'
import { JointDeclaration } from '../entities/joint-declaration'
import { DatabaseError } from './errors'

/** Reads the joint declarations projection; writes go through the journal (domain/aggregates/joint-declaration.ts) */
export interface JointDeclarationRepository {
  /** Every joint declaration, the most recent text first */
  findAll(): Effect.Effect<JointDeclaration[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<JointDeclaration | null, DatabaseError>

  /** The joint declaration a link is the source of: what a statement being typed may be a signature of */
  findBySourceUrl(sourceUrl: string): Effect.Effect<JointDeclaration | null, DatabaseError>

  /** The joint declarations whose title holds these words, for the form that picks one */
  searchByTitle(query: string): Effect.Effect<JointDeclaration[], DatabaseError>

  /** The ids of the joint declarations that take this position: what a merge of it must reach */
  findIdsByPositionId(positionId: string): Effect.Effect<string[], DatabaseError>

  /** The ids of the joint declarations that engage this subject: what its deletion must reach */
  findIdsBySubjectId(subjectId: string): Effect.Effect<string[], DatabaseError>
}

export const JointDeclarationRepository = Context.GenericTag<JointDeclarationRepository>(
  'JointDeclarationRepository',
)
