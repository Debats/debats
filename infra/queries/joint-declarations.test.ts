import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect } from 'effect'
import {
  jointDeclarationPublished,
  jointDeclarationStream,
  positionTaken,
  signatoryAdded,
} from '../../domain/aggregates/joint-declaration'
import { organisationAuthor, publicFigureAuthor } from '../../domain/entities/statement'
import { createJointDeclarationRepository } from '../database/joint-declaration-repository-supabase'
import { runUnitOfWork } from '../events/unit-of-work'
import { getPrismaClient } from '../prisma/client'
import { createAdminSupabaseClient } from '../supabase/admin'
import { loadJointDeclarationIndex, loadJointDeclarationPage } from './joint-declarations'

/**
 * Runs against the local database (`npm run test:db`): a joint declaration
 * of its own, opened through the journal on a position, a public figure, an
 * organisation and a contributor the seed provides.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const declarationId = crypto.randomUUID()
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
    figure = await prisma().public_figures.findFirstOrThrow({ select: { id: true, name: true } })
    organisation = await prisma().organisations.findFirstOrThrow({
      select: { id: true, name: true },
    })
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
  })

  afterAll(async () => {
    await prisma().joint_declarations.deleteMany({ where: { id: declarationId } })
    await prisma().domain_events.deleteMany({
      where: { stream_type: 'joint_declaration', stream_id: declarationId },
    })
    await prisma().$disconnect()
  })

  it('reads the page of a text: what it takes position on, and who signed it, in order', async () => {
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
