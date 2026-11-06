import { Effect } from 'effect'
import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { statementStream } from '../../../../domain/aggregates/statement'
import { StatementArgumentsInput } from '../../../../domain/use-cases/statement-arguments'
import { updateStatementUseCase } from '../../../../domain/use-cases/update-statement'
import { contentFieldsOf } from '../../../../domain/use-cases/validate-statement-fields'
import { createPositionRepository } from '../../../../infra/database/position-repository-supabase'
import { currentRevision } from '../../../../infra/events/stream-revision'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { checkAdminApiKey } from '../../admin-auth'
import { adminActorOf } from '../../admin-contributor'
import { runForApi } from '../../command-outcome'
import { LoadedStatement, statementById, viewOf } from '../statement'
import { parseStatementPatch, StatementPatch } from '../validation'

/** A statement as the edit form holds it, to read before correcting it. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const found = await statementById(createAdminSupabaseClient(), id)
  if ('response' in found) return found.response
  return NextResponse.json(viewOf(found.loaded))
}

/** The position the correction moves the statement to, or the one it keeps */
async function positionIdOf(
  supabase: SupabaseClient,
  loaded: LoadedStatement,
  slug: string | undefined,
): Promise<{ positionId: string } | { response: NextResponse }> {
  if (slug === undefined) return { positionId: loaded.statement.positionId }
  const found = await Effect.runPromise(
    Effect.either(createPositionRepository(supabase).findBySubjectAndSlug(loaded.subject.id, slug)),
  )
  if (found._tag === 'Left') {
    return { response: NextResponse.json({ error: 'Failed to load position' }, { status: 500 }) }
  }
  if (found.right === null) {
    return {
      response: NextResponse.json(
        { error: `Position « ${slug} » not found on subject « ${loaded.subject.slug} »` },
        { status: 404 },
      ),
    }
  }
  return { positionId: found.right.id }
}

/** The arguments after the correction: the list sent, or the ones already mobilised */
const argumentsOf = (loaded: LoadedStatement, patch: StatementPatch): StatementArgumentsInput =>
  patch.arguments === undefined
    ? { argumentIds: loaded.arguments.map((argument) => argument.id), newArguments: [] }
    : { argumentIds: [], newArguments: patch.arguments }

/**
 * Corrects a statement already on the site, field by field, as the form of
 * `/prise-de-position/<id>/modifier` does with the whole form: the fields not
 * sent keep their value, `content` and `arguments` are replaced whole.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminSupabaseClient()
  const actor = await adminActorOf(request, supabase)
  if ('response' in actor) return actor.response

  const parsed = parseStatementPatch(await request.json())
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { patch } = parsed

  const { id } = await params
  const found = await statementById(supabase, id)
  if ('response' in found) return found.response
  const { loaded } = found
  const current = viewOf(loaded)

  const position = await positionIdOf(supabase, loaded, patch.position)
  if ('response' in position) return position.response

  const outcome = await runForApi(
    updateStatementUseCase({
      contributor: actor.contributor,
      statementId: current.id,
      positionId: position.positionId,
      content: contentFieldsOf(patch.content ?? current.content),
      sourceName: patch.sourceName ?? current.sourceName,
      sourceUrl: patch.sourceUrl ?? current.sourceUrl,
      statedAt: patch.statedAt ?? current.statedAt,
      arguments: argumentsOf(loaded, patch),
      revision: await currentRevision(statementStream(current.id)),
    }),
  )
  if ('response' in outcome) return outcome.response

  const read = await statementById(supabase, id)
  if ('response' in read) return read.response
  return NextResponse.json(viewOf(read.loaded))
}
