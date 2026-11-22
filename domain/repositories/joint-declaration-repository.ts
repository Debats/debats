import { Context, Effect } from 'effect'
import type { TakenPosition } from '../aggregates/joint-declaration'
import { JointDeclaration } from '../entities/joint-declaration'
import { StatementAuthor } from '../entities/statement'
import { DatabaseError } from './errors'

/** What a joint declaration holds besides the text: the positions it takes, and its signatories */
export interface JointDeclarationHeld {
  positions: TakenPosition[]
  signatories: StatementAuthor[]
}

/** Reads the joint declarations projection; writes go through the journal (domain/aggregates/joint-declaration.ts) */
export interface JointDeclarationRepository {
  /** Every joint declaration, the most recent text first */
  findAll(): Effect.Effect<JointDeclaration[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<JointDeclaration | null, DatabaseError>

  /** The joint declaration a link is the source of: what a statement being typed may be a signature of */
  findBySourceUrl(sourceUrl: string): Effect.Effect<JointDeclaration | null, DatabaseError>

  /** The joint declarations whose title holds these words, for the form that picks one */
  searchByTitle(query: string): Effect.Effect<JointDeclaration[], DatabaseError>

  /**
   * What a text holds: the positions it takes and who signed it, as the
   * tables say. For a command that settles, before it writes, what is left to
   * add — the aggregate still decides from its stream.
   */
  findHeld(declarationId: string): Effect.Effect<JointDeclarationHeld, DatabaseError>

  /** The ids of the joint declarations that take this position: what a merge of it must reach */
  findIdsByPositionId(positionId: string): Effect.Effect<string[], DatabaseError>

  /** The ids of the joint declarations that engage this subject: what its deletion must reach */
  findIdsBySubjectId(subjectId: string): Effect.Effect<string[], DatabaseError>
}

export const JointDeclarationRepository = Context.GenericTag<JointDeclarationRepository>(
  'JointDeclarationRepository',
)
