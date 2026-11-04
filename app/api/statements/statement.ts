import { Effect, pipe } from 'effect'
import { NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Position } from '../../../domain/entities/position'
import { Statement, StatementAuthor } from '../../../domain/entities/statement'
import { Subject } from '../../../domain/entities/subject'
import { ArgumentRef } from '../../../domain/read-models/argument'
import {
  organisationEntityRef,
  publicFigureRef,
  StatementAuthorRef,
} from '../../../domain/read-models/statement-author'
import {
  StatementCorrectionView,
  statementCorrectionView,
} from '../../../domain/read-models/statement-correction'
import { DatabaseError } from '../../../domain/repositories/errors'
import { createArgumentRepository } from '../../../infra/database/argument-repository-supabase'
import { createOrganisationRepository } from '../../../infra/database/organisation-repository-supabase'
import { createPositionRepository } from '../../../infra/database/position-repository-supabase'
import { createPublicFigureRepository } from '../../../infra/database/public-figure-repository-supabase'
import { createStatementRepository } from '../../../infra/database/statement-repository-supabase'
import { createSubjectRepository } from '../../../infra/database/subject-repository-supabase'

/** A statement with everything its correction needs to read and to name */
export interface LoadedStatement {
  statement: Statement
  position: Position
  subject: Subject
  author: StatementAuthorRef
  arguments: ArgumentRef[]
}

/** The projection names a statement that its author or position no longer answers for: a defect of the data */
class Orphan extends Error {
  readonly _tag = 'Orphan'
}

const present =
  <A>(what: string) =>
  (value: A | null): Effect.Effect<A, Orphan> =>
    value === null ? Effect.fail(new Orphan(`${what} is missing`)) : Effect.succeed(value)

/** Who took position, by the page of the author */
function authorRefOf(
  supabase: SupabaseClient,
  author: StatementAuthor,
): Effect.Effect<StatementAuthorRef, DatabaseError | Orphan> {
  return author.kind === 'organisation'
    ? pipe(
        createOrganisationRepository(supabase).findById(author.id),
        Effect.flatMap(present('organisation')),
        Effect.map(organisationEntityRef),
      )
    : pipe(
        createPublicFigureRepository(supabase).findById(author.id),
        Effect.flatMap(present('public figure')),
        Effect.map(publicFigureRef),
      )
}

function load(
  supabase: SupabaseClient,
  id: string,
): Effect.Effect<LoadedStatement | null, DatabaseError | Orphan> {
  return pipe(
    createStatementRepository(supabase).findById(id),
    Effect.flatMap((statement) =>
      statement === null
        ? Effect.succeed(null)
        : pipe(
            createPositionRepository(supabase).findById(statement.positionId),
            Effect.flatMap(present('position')),
            Effect.flatMap((position) =>
              Effect.all({
                statement: Effect.succeed(statement),
                position: Effect.succeed(position),
                subject: pipe(
                  createSubjectRepository(supabase).findById(position.subjectId),
                  Effect.flatMap(present('subject')),
                ),
                author: authorRefOf(supabase, statement.author),
                arguments: createArgumentRepository(supabase).findRefsByStatementId(statement.id),
              }),
            ),
          ),
    ),
  )
}

/** The statement a route works on, or the answer when there is none */
export async function statementById(
  supabase: SupabaseClient,
  id: string,
): Promise<{ loaded: LoadedStatement } | { response: NextResponse }> {
  const found = await Effect.runPromise(Effect.either(load(supabase, id)))
  if (found._tag === 'Left') {
    return {
      response: NextResponse.json(
        { error: `Failed to load statement: ${found.left.message}` },
        { status: 500 },
      ),
    }
  }
  if (found.right === null) {
    return { response: NextResponse.json({ error: 'Statement not found' }, { status: 404 }) }
  }
  return { loaded: found.right }
}

export const viewOf = (loaded: LoadedStatement): StatementCorrectionView =>
  statementCorrectionView(
    loaded.statement,
    loaded.author,
    loaded.subject,
    loaded.position,
    loaded.arguments,
  )
