import { Context, Effect } from 'effect'
import { Statement, StatementAuthor } from '../entities/statement'
import { LatestStatement } from '../read-models/latest-statement'
import { Position } from '../entities/position'
import { Subject } from '../entities/subject'
import { StatementAuthorRef } from '../read-models/statement-author'
import { ArgumentRef } from '../read-models/argument'
import { FeedEntriesPage, FeedGathering, FeedRanking } from '../read-models/feed-entries'
import { FeedFilters } from '../read-models/statement-feed'

export class DatabaseError extends Error {
  readonly _tag = 'DatabaseError'
}

/**
 * Statement with related position and subject details
 */
export interface StatementWithDetails {
  statement: Statement
  position: Position
  subject: Subject
  /** The arguments the statement mobilises, by title */
  arguments: ArgumentRef[]
}

/**
 * Statement with its position and who took it (public figure or organisation)
 */
export interface StatementWithAuthor {
  statement: Statement
  position: Position
  author: StatementAuthorRef
  arguments: ArgumentRef[]
}

/** One page of the feed, and how many statements the filters match in all */
export interface FeedPage {
  entries: StatementWithAuthorAndSubject[]
  total: number
}

/** The first and last days an opinion was stated on a subject */
export interface StatedSpan {
  from: Date
  to: Date
}

/** Everything an argument's page needs about one statement that mobilises it */
export interface StatementWithAuthorAndSubject extends StatementWithAuthor {
  subject: Subject
}

export interface StatementRepository {
  findById(id: string): Effect.Effect<Statement | null, DatabaseError>

  findByPublicFigureId(publicFigureId: string): Effect.Effect<Statement[], DatabaseError>

  findByPositionId(positionId: string): Effect.Effect<Statement[], DatabaseError>

  findByPositionIdWithAuthors(
    positionId: string,
  ): Effect.Effect<StatementWithAuthor[], DatabaseError>

  /**
   * A page of the statements nobody has confirmed nor flagged yet, the last
   * added first, never one the viewer added herself, with how many there are
   * in all. Past the end of the queue, the page is empty and counts none.
   */
  findToReview(
    viewerId: string | null,
    page: { limit: number; offset: number },
  ): Effect.Effect<FeedPage, DatabaseError>

  /**
   * The last statement of a position that carries words (a declaration or a
   * programme): what can be quoted for it. Null when it only holds votes and
   * acts, or nothing.
   */
  findLatestQuotedByPositionId(
    positionId: string,
  ): Effect.Effect<StatementWithAuthor | null, DatabaseError>

  /**
   * Get all statements for a public figure with position and subject details
   */
  findByPublicFigureWithDetails(
    publicFigureId: string,
  ): Effect.Effect<StatementWithDetails[], DatabaseError>

  /**
   * Get all statements of an organisation with position and subject details
   */
  findByOrganisationWithDetails(
    organisationId: string,
  ): Effect.Effect<StatementWithDetails[], DatabaseError>

  /**
   * Get all statements for a public figure on a specific subject
   */
  findByPublicFigureAndSubject(
    publicFigureId: string,
    subjectId: string,
  ): Effect.Effect<StatementWithDetails[], DatabaseError>

  /**
   * Get all statements of an organisation on a specific subject
   */
  findByOrganisationAndSubject(
    organisationId: string,
    subjectId: string,
  ): Effect.Effect<StatementWithDetails[], DatabaseError>

  /**
   * Les prises de position d'un auteur sur une poignée de sujets : ce que
   * la page « un auteur sur un sujet » montre de ses sujets voisins, sans
   * charger tout son historique.
   */
  findByAuthorAndSubjectIds(
    author: StatementAuthor,
    subjectIds: string[],
  ): Effect.Effect<StatementWithDetails[], DatabaseError>

  /**
   * Get every statement mobilising an argument, with position, subject and author
   */
  findByArgumentWithAuthors(
    argumentId: string,
  ): Effect.Effect<StatementWithAuthorAndSubject[], DatabaseError>

  /**
   * Get all statements for a subject with their position and author
   */
  findBySubjectWithAuthors(subjectId: string): Effect.Effect<StatementWithAuthor[], DatabaseError>

  /** Every live statement on any of these subjects, with its position and author */
  findBySubjectIdsWithAuthors(
    subjectIds: string[],
  ): Effect.Effect<StatementWithAuthor[], DatabaseError>

  /** The ids of the live statements on any position of a subject */
  findIdsBySubjectId(subjectId: string): Effect.Effect<string[], DatabaseError>

  /**
   * The feed of the whole site, narrowed, ranked and paged by entries: the
   * signatures of one joint declaration make one entry, and so does, when
   * asked, what one author said or did the same day
   * (`read-models/feed-entries.ts`). The one reading of the last statements
   * of the site: rails and feed page alike.
   */
  findFeed(
    filters: FeedFilters,
    ranking: FeedRanking,
    gathering: FeedGathering,
    page: { limit: number; offset: number },
  ): Effect.Effect<FeedEntriesPage, DatabaseError>

  /** The first and last days an opinion was stated on a subject; null without any */
  findStatedSpanBySubjectId(subjectId: string): Effect.Effect<StatedSpan | null, DatabaseError>

  /**
   * The id of the statement a signatory holds on one position of a joint
   * declaration; null when the signature made none there
   */
  findSignatureId(
    jointDeclarationId: string,
    author: StatementAuthor,
    positionId: string,
  ): Effect.Effect<string | null, DatabaseError>

  /**
   * The ids of the live statements a signatory holds by signing a joint
   * declaration, one per position the text takes
   */
  findSignatureIds(
    jointDeclarationId: string,
    author: StatementAuthor,
  ): Effect.Effect<string[], DatabaseError>

  /** The ids of the live statements mobilising an argument */
  findIdsByArgumentId(argumentId: string): Effect.Effect<string[], DatabaseError>

  /**
   * The last statements made on one subject, newest stated first. Across the
   * site, the last statements are read from the feed (`findFeed`).
   */
  findLatest(limit: number, subjectId: string): Effect.Effect<LatestStatement[], DatabaseError>
}

export const StatementRepository = Context.GenericTag<StatementRepository>('StatementRepository')
