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
  parseDraftSection,
  validateSlugifiableFields,
} from './validation'
import { createChantierRepository } from '../../../infra/database/chantier-repository-supabase'
import { createOccupationRepository } from '../../../infra/database/occupation-repository-supabase'
import { sameOccupationName } from '../../../domain/entities/occupation'
import { checkAdminApiKey } from '../admin-auth'

export async function GET(request: NextRequest) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const chantier = request.nextUrl.searchParams.get('chantier')
  if (chantier) return draftsOfChantier(chantier)

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

/** The drafts of one chantier, whatever became of them: the agent reads its own work back */
async function draftsOfChantier(chantierId: string) {
  if (!UUID.test(chantierId)) {
    return NextResponse.json({ error: 'Invalid chantier id' }, { status: 400 })
  }
  const draftRepo = createDraftStatementRepository(createAdminSupabaseClient())
  const result = await Effect.runPromise(Effect.either(draftRepo.findByChantier(chantierId)))
  if (result._tag === 'Left') {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  return NextResponse.json(result.right)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  if (
    input.chantier !== undefined &&
    !(typeof input.chantier === 'string' && UUID.test(input.chantier))
  ) {
    return { error: 'Field chantier must be the id of a chantier' }
  }

  const parsedSection = parseDraftSection(input.section)
  if ('error' in parsedSection) return parsedSection

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
      chantierId: (input.chantier as string | undefined) ?? null,
      section: parsedSection.section,
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

/** A draft names the chantier it belongs to: one that does not exist is the agent's mistake, told as such */
async function unknownChantier(
  drafts: NewDraftStatement[],
  supabase: ReturnType<typeof createAdminSupabaseClient>,
): Promise<string | null> {
  const named = Array.from(new Set(drafts.flatMap((draft) => draft.chantierId ?? [])))
  if (named.length === 0) return null
  const chantiers = createChantierRepository(supabase)
  for (const id of named) {
    const found = await Effect.runPromise(Effect.either(chantiers.findById(id)))
    if (found._tag === 'Left') return 'Could not read the chantiers'
    if (found.right === null) return `Unknown chantier « ${id} »`
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

  const chantierError = await unknownChantier(parsed, supabase)
  if (chantierError) {
    return NextResponse.json({ error: chantierError }, { status: 400 })
  }

  const draftRepo = createDraftStatementRepository(supabase)
  const result = await Effect.runPromise(Effect.either(draftRepo.createMany(parsed)))

  if (result._tag === 'Left') {
    return NextResponse.json({ error: result.left.message }, { status: 500 })
  }

  return NextResponse.json({ created: result.right.length, ids: result.right }, { status: 201 })
}
