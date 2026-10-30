import { NextRequest, NextResponse } from 'next/server'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../../infra/database/draft-statement-repository-supabase'
import { NewDraftStatement } from '../../../domain/repositories/draft-statement-repository'
import {
  parseDraftAffiliations,
  parseDraftArguments,
  parseDraftAuthor,
  parseDraftContent,
  parseDraftOccupations,
  validateSlugifiableFields,
} from './validation'
import { createOccupationRepository } from '../../../infra/database/occupation-repository-supabase'
import { sameOccupationName } from '../../../domain/entities/occupation'
import { checkAdminApiKey } from '../admin-auth'

export async function GET(request: NextRequest) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = request.nextUrl.searchParams.get('status') ?? 'pending'
  const validStatuses = ['pending', 'rejected', 'revision_requested'] as const
  if (!validStatuses.includes(status as (typeof validStatuses)[number])) {
    return NextResponse.json(
      { error: 'Invalid status. Use "pending", "rejected" or "revision_requested".' },
      { status: 400 },
    )
  }

  const supabase = createAdminSupabaseClient()
  const draftRepo = createDraftStatementRepository(supabase)

  const result = await Effect.runPromise(
    Effect.either(draftRepo.findByStatus(status as (typeof validStatuses)[number])),
  )

  if (result._tag === 'Left') {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json(result.right)
}

const REQUIRED_FIELDS = [
  'subjectTitle',
  'positionTitle',
  'sourceName',
  'sourceUrl',
  'date',
  'origin',
] as const

/** Parses one posted draft, or says why it is refused. */
function parseDraftInput(
  input: Record<string, unknown>,
): { draft: NewDraftStatement } | { error: string } {
  for (const field of REQUIRED_FIELDS) {
    if (typeof input[field] !== 'string' || !input[field]) {
      return { error: `Missing or empty required field: ${field}` }
    }
  }
  const slugError = validateSlugifiableFields(input, false)
  if (slugError) return { error: slugError }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date as string)) {
    return { error: 'Invalid date format (expected YYYY-MM-DD)' }
  }

  const parsedAuthor = parseDraftAuthor(input.author)
  if ('error' in parsedAuthor) return parsedAuthor

  const parsedContent = parseDraftContent(input.content)
  if ('error' in parsedContent) return parsedContent

  const parsedArguments = parseDraftArguments(input.arguments)
  if ('error' in parsedArguments) return parsedArguments

  const parsedOccupations = parseDraftOccupations(input.occupations)
  if ('error' in parsedOccupations) return parsedOccupations

  const parsedAffiliations = parseDraftAffiliations(input.affiliations)
  if ('error' in parsedAffiliations) return parsedAffiliations

  // Occupations and affiliations describe the person, so an organisation has neither.
  if (
    parsedAuthor.author.kind === 'organisation' &&
    (parsedOccupations.occupations.length > 0 || parsedAffiliations.affiliations.length > 0)
  ) {
    return { error: 'Fields occupations and affiliations only apply to a public figure author' }
  }

  return {
    draft: {
      author: parsedAuthor.author,
      arguments: parsedArguments.arguments,
      occupations: parsedOccupations.occupations,
      affiliations: parsedAffiliations.affiliations,
      content: parsedContent.content,
      subjectTitle: input.subjectTitle as string,
      positionTitle: input.positionTitle as string,
      sourceName: input.sourceName as string,
      sourceUrl: input.sourceUrl as string,
      date: input.date as string,
      aiNotes: (input.aiNotes as string) ?? null,
      subjectData: (input.subjectData as NewDraftStatement['subjectData']) ?? null,
      positionData: (input.positionData as NewDraftStatement['positionData']) ?? null,
      origin: input.origin as string,
    },
  }
}

/**
 * Occupations are a closed list, so a name is checked when the draft is posted
 * rather than discovered at validation, once the batch has been reviewed.
 */
async function canonicaliseOccupations(
  drafts: NewDraftStatement[],
  supabase: ReturnType<typeof createAdminSupabaseClient>,
): Promise<string | null> {
  if (!drafts.some((draft) => draft.occupations.length > 0)) return null

  const listed = await Effect.runPromise(
    Effect.either(createOccupationRepository(supabase).findAll()),
  )
  if (listed._tag === 'Left') return 'Could not read the occupations list'

  for (let index = 0; index < drafts.length; index++) {
    for (const occupation of drafts[index].occupations) {
      const match = listed.right.find((listedOccupation) =>
        sameOccupationName(occupation.name, listedOccupation.name),
      )
      if (!match) {
        const names = listed.right.map((o) => o.name).join(', ')
        return `Draft ${index}: unknown occupation « ${occupation.name} ». Known occupations: ${names}`
      }
      occupation.name = match.name
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const drafts = Array.isArray(body) ? body : [body]

  if (drafts.length === 0) {
    return NextResponse.json({ error: 'Expected at least one draft.' }, { status: 400 })
  }

  const parsed: NewDraftStatement[] = []
  for (let index = 0; index < drafts.length; index++) {
    const result = parseDraftInput(drafts[index])
    if ('error' in result) {
      return NextResponse.json({ error: `Draft ${index}: ${result.error}` }, { status: 400 })
    }
    parsed.push(result.draft)
  }

  const supabase = createAdminSupabaseClient()

  const occupationError = await canonicaliseOccupations(parsed, supabase)
  if (occupationError) {
    return NextResponse.json({ error: occupationError }, { status: 400 })
  }

  const draftRepo = createDraftStatementRepository(supabase)
  const result = await Effect.runPromise(Effect.either(draftRepo.createMany(parsed)))

  if (result._tag === 'Left') {
    return NextResponse.json({ error: result.left.message }, { status: 500 })
  }

  return NextResponse.json({ created: result.right.length, ids: result.right }, { status: 201 })
}
