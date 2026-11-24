import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect } from 'effect'
import {
  jointDeclarationPublished,
  jointDeclarationStream,
  positionTaken,
  signatoryAdded,
} from '../../domain/aggregates/joint-declaration'
import {
  statementAdded,
  statementJoinedDeclaration,
  statementStream,
} from '../../domain/aggregates/statement'
import {
  actContent,
  declarationContent,
  organisationAuthor,
  publicFigureAuthor,
} from '../../domain/entities/statement'
import { createJointDeclarationRepository } from '../database/joint-declaration-repository-supabase'
import { createStatementRepository } from '../database/statement-repository-supabase'
import { runUnitOfWork } from '../events/unit-of-work'
import { getPrismaClient } from '../prisma/client'
import { createAdminSupabaseClient } from '../supabase/admin'
import {
  loadAttachmentPlan,
  loadJointDeclarationIndex,
  loadJointDeclarationPage,
} from './joint-declarations'
import { getSubjectPositionsSummary } from './subject-positions-summary'

/**
 * Runs against the local database (`npm run test:db`): a joint declaration
 * of its own, opened through the journal on a position, a public figure, an
 * organisation and a contributor the seed provides.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const declarationId = crypto.randomUUID()
const statementId = crypto.randomUUID()
const secondStatementId = crypto.randomUUID()
const deedId = crypto.randomUUID()
const tag = declarationId.slice(0, 8)
const slug = `appel-de-test-${tag}`
const sourceUrl = `https://example.org/appel-${tag}`
const quote = 'Les mots du texte qui énoncent la position.'

describe.skipIf(!hasDatabase)('joint declaration reads', () => {
  // Built once the suite runs: without a database, the environment has no Supabase either
  let supabase: ReturnType<typeof createAdminSupabaseClient>
  let position: { id: string; subject_id: string; title: string }
  let figure: { id: string; name: string }
  let organisation: { id: string; name: string }

  beforeAll(async () => {
    supabase = createAdminSupabaseClient()
    position = await prisma().positions.findFirstOrThrow({
      where: { deleted_at: null, subjects: { deleted_at: null } },
      select: { id: true, subject_id: true, title: true },
    })
    // The signatories are chosen so that only the count of subjects can put the figure first: she is
    // the most documented of the site, and the organisation, documented on nothing, bears a name
    // that reads before hers
    const documented = await supabase
      .from('v_public_figure_activity_summary')
      .select('id, name')
      .gt('subjects_count', 1)
      .order('subjects_count', { ascending: false })
      .limit(1)
      .single()
    if (documented.error) throw documented.error
    figure = { id: documented.data.id!, name: documented.data.name! }
    const undocumented = await supabase
      .from('v_organisation_summary')
      .select('id, name')
      .eq('subjects_count', 0)
      .lt('name', figure.name)
      .limit(1)
      .single()
    if (undocumented.error) throw undocumented.error
    organisation = { id: undocumented.data.id!, name: undocumented.data.name! }
    const actor = await prisma().contributors.findFirstOrThrow({ select: { id: true } })
    await Effect.runPromise(
      runUnitOfWork((journal) =>
        journal.append(
          jointDeclarationStream(declarationId),
          0,
          [
            jointDeclarationPublished({
              title: `Appel de test ${tag}`,
              presentation: 'Pour le test.',
              sourceName: 'Le Monde',
              sourceUrl,
              declaredAt: new Date('2026-11-21'),
            }),
            positionTaken({ subjectId: position.subject_id, positionId: position.id, quote }),
            signatoryAdded(publicFigureAuthor(figure.id)),
            signatoryAdded(organisationAuthor(organisation.id)),
          ],
          { actorId: actor.id },
        ),
      ),
    )
    // The signature of the public figure, as the command would have written it
    await Effect.runPromise(
      runUnitOfWork((journal) =>
        journal.append(
          statementStream(statementId),
          0,
          [
            statementAdded({
              author: publicFigureAuthor(figure.id),
              subjectId: position.subject_id,
              positionId: position.id,
              content: declarationContent(quote),
              sourceName: 'Le Monde',
              sourceUrl,
              statedAt: new Date('2026-11-21'),
              argumentIds: [],
              jointDeclarationId: declarationId,
            }),
          ],
          { actorId: actor.id },
        ),
      ),
    )
  })

  afterAll(async () => {
    await prisma().statements.deleteMany({
      where: { id: { in: [statementId, secondStatementId, deedId] } },
    })
    await prisma().joint_declarations.deleteMany({ where: { id: declarationId } })
    await prisma().domain_events.deleteMany({
      where: {
        OR: [
          { stream_type: 'joint_declaration', stream_id: declarationId },
          {
            stream_type: 'statement',
            stream_id: { in: [statementId, secondStatementId, deedId] },
          },
        ],
      },
    })
    await prisma().$disconnect()
  })

  it('narrows the feed to the signatures of the text, each naming it', async () => {
    const feed = await Effect.runPromise(
      createStatementRepository(supabase).findFeed({ jointDeclarationSlug: slug }, 'stated', {
        limit: 20,
        offset: 0,
      }),
    )

    expect(feed.total).toBe(1)
    expect(feed.entries.map(({ statement }) => [statement.id, statement.jointDeclaration])).toEqual(
      [[statementId, { id: declarationId, title: `Appel de test ${tag}`, slug }]],
    )
  })

  it('names the text on the statement a subject page features, when it is a signature', async () => {
    // Dated after everything else on the position, so that it is the one featured; gone before the next test
    const featuredId = crypto.randomUUID()
    const actor = await prisma().contributors.findFirstOrThrow({ select: { id: true } })
    await Effect.runPromise(
      runUnitOfWork((journal) =>
        journal.append(
          statementStream(featuredId),
          0,
          [
            statementAdded({
              author: organisationAuthor(organisation.id),
              subjectId: position.subject_id,
              positionId: position.id,
              content: declarationContent(quote),
              sourceName: 'Le Monde',
              sourceUrl,
              statedAt: new Date('2099-01-01'),
              argumentIds: [],
              jointDeclarationId: declarationId,
            }),
          ],
          { actorId: actor.id },
        ),
      ),
    )

    try {
      const summaries = await Effect.runPromise(
        getSubjectPositionsSummary(supabase, position.subject_id),
      )
      const featured = summaries.find((summary) => summary.positionId === position.id)

      expect(featured?.latestStatement).toMatchObject({
        id: featuredId,
        jointDeclaration: { id: declarationId, title: `Appel de test ${tag}`, slug },
      })
      // A position whose featured statement is the author's own names no text
      for (const other of summaries) {
        if (other.positionId !== position.id) {
          expect(other.latestStatement?.jointDeclaration?.id).not.toBe(declarationId)
        }
      }
    } finally {
      await prisma().statements.deleteMany({ where: { id: featuredId } })
      await prisma().domain_events.deleteMany({
        where: { stream_type: 'statement', stream_id: featuredId },
      })
    }
  })

  it('tells what the text holds, and finds the statement a signature made', async () => {
    const held = await Effect.runPromise(
      createJointDeclarationRepository(supabase).findHeld(declarationId),
    )
    expect(held.positions).toEqual([
      { subjectId: position.subject_id, positionId: position.id, quote },
    ])
    expect(held.signatories).toHaveLength(2)
    expect(held.signatories).toEqual(
      expect.arrayContaining([publicFigureAuthor(figure.id), organisationAuthor(organisation.id)]),
    )

    const statements = createStatementRepository(supabase)
    expect(
      await Effect.runPromise(
        statements.findSignatureId(declarationId, publicFigureAuthor(figure.id), position.id),
      ),
    ).toBe(statementId)
    // The organisation signed, but this suite wrote no statement for it
    expect(
      await Effect.runPromise(
        statements.findSignatureId(declarationId, organisationAuthor(organisation.id), position.id),
      ),
    ).toBeNull()
  })

  it('counts a signature once in the feed, whatever the number of statements it made', async () => {
    const statements = createStatementRepository(supabase)
    const elsewhere = await prisma().positions.findFirstOrThrow({
      where: {
        deleted_at: null,
        subject_id: { not: position.subject_id },
        subjects: { deleted_at: null },
      },
      select: { id: true, subject_id: true },
    })
    const actor = await prisma().contributors.findFirstOrThrow({ select: { id: true } })
    // The same signatory on a second position of the text, recorded after the first
    await Effect.runPromise(
      runUnitOfWork((journal) =>
        journal.append(
          statementStream(secondStatementId),
          0,
          [
            statementAdded({
              author: publicFigureAuthor(figure.id),
              subjectId: elsewhere.subject_id,
              positionId: elsewhere.id,
              content: declarationContent(quote),
              sourceName: 'Le Monde',
              sourceUrl,
              statedAt: new Date('2026-11-21'),
              argumentIds: [],
              jointDeclarationId: declarationId,
            }),
          ],
          { actorId: actor.id },
        ),
      ),
    )

    const feed = await Effect.runPromise(
      statements.findFeed({ jointDeclarationSlug: slug }, 'stated', { limit: 20, offset: 0 }),
    )
    expect(feed.total).toBe(1)
    expect(feed.entries.map(({ statement }) => statement.id)).toEqual([statementId])

    const made = await Effect.runPromise(
      statements.findSignatureIds(declarationId, publicFigureAuthor(figure.id)),
    )
    expect([...made].sort()).toEqual([statementId, secondStatementId].sort())
  })

  it('plans the attachment of a deed of the organisation, then makes it the signature the text makes', async () => {
    const actor = await prisma().contributors.findFirstOrThrow({ select: { id: true } })
    const author = organisationAuthor(organisation.id)
    const deed = {
      author,
      subjectId: position.subject_id,
      positionId: position.id,
      content: actContent('Signataire de l’appel de test'),
      sourceName: 'Seuil',
      sourceUrl: 'https://example.org/seuil',
      statedAt: new Date('2026-11-20'),
      argumentIds: [],
    }
    await Effect.runPromise(
      runUnitOfWork((journal) =>
        journal.append(statementStream(deedId), 0, [statementAdded(deed)], { actorId: actor.id }),
      ),
    )

    const plan = await Effect.runPromise(
      loadAttachmentPlan(supabase, { id: deedId, ...deed }, slug),
    )
    expect(plan?.refusal).toBeUndefined()
    expect(plan?.stances.find((stance) => stance.positionId === position.id)).toMatchObject({
      kind: 'attached',
      replaces: false,
      quote,
    })
    expect(
      await Effect.runPromise(loadAttachmentPlan(supabase, { id: deedId, ...deed }, 'none')),
    ).toBe(null)

    await Effect.runPromise(
      runUnitOfWork((journal) =>
        journal.append(
          statementStream(deedId),
          1,
          [
            statementJoinedDeclaration({
              ...deed,
              content: declarationContent(quote),
              sourceName: 'Le Monde',
              sourceUrl,
              statedAt: new Date('2026-11-21'),
              jointDeclarationId: declarationId,
            }),
          ],
          { actorId: actor.id },
        ),
      ),
    )
    expect(await prisma().statements.findUniqueOrThrow({ where: { id: deedId } })).toMatchObject({
      joint_declaration_id: declarationId,
      statement_type: 'declaration',
      quote,
      deed: null,
      source_name: 'Le Monde',
      source_url: sourceUrl,
      stated_at: new Date('2026-11-21'),
      position_id: position.id,
    })
  })

  it('narrows the feed to nothing for a slug no text bears', async () => {
    const feed = await Effect.runPromise(
      createStatementRepository(supabase).findFeed(
        { jointDeclarationSlug: `inconnu-${tag}` },
        'stated',
        { limit: 20, offset: 0 },
      ),
    )
    expect(feed).toEqual({ entries: [], total: 0 })
  })

  it('reads the page of a text: what it takes position on, and who signed it, the most documented first', async () => {
    // Without the counts, the names alone would put the organisation first
    expect(organisation.name.localeCompare(figure.name, 'fr')).toBeLessThan(0)

    const page = await Effect.runPromise(loadJointDeclarationPage(supabase, slug))

    expect(page?.declaration).toMatchObject({
      id: declarationId,
      title: `Appel de test ${tag}`,
      presentation: 'Pour le test.',
      declaredAt: new Date('2026-11-21'),
    })
    expect(page?.stances).toMatchObject([
      {
        subject: { id: position.subject_id },
        position: { id: position.id, title: position.title },
        quote,
      },
    ])
    expect(page?.signatories.map(({ author }) => [author.kind, author.name])).toEqual([
      ['public_figure', figure.name],
      ['organisation', organisation.name],
    ])
  })

  it('reads nothing for a slug no text bears', async () => {
    expect(await Effect.runPromise(loadJointDeclarationPage(supabase, `inconnu-${tag}`))).toBeNull()
  })

  it('lists the text in the index, with the subjects it engages and its signatories', async () => {
    const index = await Effect.runPromise(loadJointDeclarationIndex(supabase))
    const listed = index.find((summary) => summary.id === declarationId)

    expect(listed).toMatchObject({ slug, presentation: 'Pour le test.' })
    expect(listed?.subjects).toHaveLength(1)
    expect(listed?.signatories.map((author) => author.kind)).toEqual([
      'public_figure',
      'organisation',
    ])
  })

  it('finds the text a link is the source of, however the link was typed', async () => {
    const repository = createJointDeclarationRepository(supabase)
    const typedOtherwise = `http://www.example.org/appel-${tag}/`

    const found = await Effect.runPromise(repository.findBySourceUrl(typedOtherwise))
    expect(found?.id).toBe(declarationId)
    expect(
      await Effect.runPromise(repository.findBySourceUrl(`https://example.org/appel-${tag}/en`)),
    ).toBeNull()
  })

  it('tells which texts take a position, and which engage a subject', async () => {
    const repository = createJointDeclarationRepository(supabase)

    expect(await Effect.runPromise(repository.findIdsByPositionId(position.id))).toContain(
      declarationId,
    )
    expect(await Effect.runPromise(repository.findIdsBySubjectId(position.subject_id))).toContain(
      declarationId,
    )
  })

  it('finds the text by words of its title', async () => {
    const found = await Effect.runPromise(
      createJointDeclarationRepository(supabase).searchByTitle(`test ${tag}`),
    )
    expect(found.map((declaration) => declaration.id)).toEqual([declarationId])
  })
})
