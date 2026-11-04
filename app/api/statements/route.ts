import { Effect } from 'effect'
import { NextRequest, NextResponse } from 'next/server'
import { Subject } from '../../../domain/entities/subject'
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
import {
  StatementRepository,
  StatementWithDetails,
} from '../../../domain/repositories/statement-repository'
import { createOrganisationRepository } from '../../../infra/database/organisation-repository-supabase'
import { createPublicFigureRepository } from '../../../infra/database/public-figure-repository-supabase'
import { createStatementRepository } from '../../../infra/database/statement-repository-supabase'
import { createSubjectRepository } from '../../../infra/database/subject-repository-supabase'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { checkAdminApiKey } from '../admin-auth'

const FILTERS = ['subject', 'figure', 'organisation'] as const
type Filter = (typeof FILTERS)[number]

const USAGE = 'Give exactly one of: subject=<slug>, figure=<slug>, organisation=<slug>'

type Listing = Effect.Effect<StatementCorrectionView[], DatabaseError>

/** The statements of a subject, whoever took them */
const ofSubject = (statements: StatementRepository, subject: Subject): Listing =>
  Effect.map(statements.findBySubjectWithAuthors(subject.id), (entries) =>
    entries.map(({ statement, position, author, arguments: mobilised }) =>
      statementCorrectionView(statement, author, subject, position, mobilised),
    ),
  )

/** The statements of one author, on every subject */
const ofAuthor = (
  author: StatementAuthorRef,
  details: Effect.Effect<StatementWithDetails[], DatabaseError>,
): Listing =>
  Effect.map(details, (entries) =>
    entries.map(({ statement, position, subject, arguments: mobilised }) =>
      statementCorrectionView(statement, author, subject, position, mobilised),
    ),
  )

/** The listing of an entity found by its slug; null when the slug names nothing */
const whenFound = <A>(
  found: Effect.Effect<A | null, DatabaseError>,
  list: (entity: A) => Listing,
): Effect.Effect<StatementCorrectionView[] | null, DatabaseError> =>
  Effect.flatMap(found, (entity) => (entity === null ? Effect.succeed(null) : list(entity)))

/** The statements the filter names; null when the slug names nothing */
function listed(filter: Filter, slug: string) {
  const supabase = createAdminSupabaseClient()
  const statements = createStatementRepository(supabase)
  switch (filter) {
    case 'subject':
      return whenFound(createSubjectRepository(supabase).findBySlug(slug), (subject) =>
        ofSubject(statements, subject),
      )
    case 'figure':
      return whenFound(createPublicFigureRepository(supabase).findBySlug(slug), (figure) =>
        ofAuthor(publicFigureRef(figure), statements.findByPublicFigureWithDetails(figure.id)),
      )
    case 'organisation':
      return whenFound(createOrganisationRepository(supabase).findBySlug(slug), (organisation) =>
        ofAuthor(
          organisationEntityRef(organisation),
          statements.findByOrganisationWithDetails(organisation.id),
        ),
      )
  }
}

/**
 * The statements on the site to correct, by subject or by author, each as the
 * edit form holds it: what a contributor lists before correcting in series.
 */
export async function GET(request: NextRequest) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const query = request.nextUrl.searchParams
  const given = FILTERS.filter((filter) => query.get(filter))
  if (given.length !== 1) return NextResponse.json({ error: USAGE }, { status: 400 })
  const filter = given[0]
  const slug = query.get(filter) as string

  const found = await Effect.runPromise(Effect.either(listed(filter, slug)))
  if (found._tag === 'Left') {
    return NextResponse.json({ error: 'Failed to load statements' }, { status: 500 })
  }
  if (found.right === null) {
    return NextResponse.json({ error: `No ${filter} « ${slug} »` }, { status: 404 })
  }
  return NextResponse.json({ statements: found.right })
}
