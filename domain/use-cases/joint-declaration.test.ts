import { describe, it, expect } from 'vitest'
import { Either, Layer } from 'effect'
import { ALREADY_SIGNATORY, SUBJECT_ALREADY_ENGAGED } from '../aggregates/joint-declaration'
import { organisationAuthor, publicFigureAuthor, StatementAuthor } from '../entities/statement'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { JointDeclarationRepository } from '../repositories/joint-declaration-repository'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { PositionRepository } from '../repositories/position-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { runFormWith } from './command-test-helpers'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import {
  fakeJointDeclarationRepo,
  fakePositionRepo,
  journalWithJointDeclarations,
  sampleJointDeclaration,
} from './joint-declaration-test-helpers'
import {
  fakeOrganisationRepo,
  fakePublicFigureRepo,
  fakeWikipediaValidator,
  sampleFigure,
  sampleOrganisation,
} from './organisation-test-helpers'
import { WikipediaValidator } from '../services/wikipedia-validator'
import {
  JOINT_DECLARATION_TITLE_TAKEN,
  publishJointDeclarationUseCase,
  sourceAlreadyReferenced,
  TAKEN_POSITION_NOT_FOUND,
  TAKEN_QUOTE_TOO_SHORT,
} from './publish-joint-declaration'
import { signJointDeclarationUseCase } from './sign-joint-declaration'
import { samplePosition } from './subject-test-helpers'
import { takeJointPositionUseCase } from './take-joint-position'

const contributor = { id: 'alice', reputation: 0 }
const eloquent = { id: 'bob', reputation: 1000 }

const onMedia = samplePosition('subject-media', 'Renforcer l’indépendance des médias')
const onAi = samplePosition('subject-ai', 'Déprivatiser les sociétés d’IA')
const otherOnMedia = samplePosition('subject-media', 'Une loi anticoncentration')

const figure = sampleFigure()
const organisation = sampleOrganisation()

const mediaQuote = 'un renforcement de l’indépendance des médias'
const aiQuote = 'un nouveau modèle de propriété des sociétés d’intelligence artificielle'

const takenOnMedia = { subjectId: 'subject-media', positionId: onMedia.id, quote: mediaQuote }
const takenOnAi = { subjectId: 'subject-ai', positionId: onAi.id, quote: aiQuote }

const fakes = (declarations = fakeJointDeclarationRepo()) =>
  Layer.mergeAll(
    Layer.succeed(JointDeclarationRepository, declarations),
    Layer.succeed(PositionRepository, fakePositionRepo([onMedia, onAi, otherOnMedia])),
    Layer.succeed(PublicFigureRepository, fakePublicFigureRepo([figure])),
    Layer.succeed(OrganisationRepository, fakeOrganisationRepo([organisation])),
    Layer.succeed(
      WikipediaValidator,
      fakeWikipediaValidator({ exists: true, isArticle: true, isBiography: true }),
    ),
  )

const execute = runFormWith(fakes())

const newDeclaration = {
  contributor,
  title: ' Le Manifeste de Paris ',
  presentation: "Contre l'oligarchie internationale",
  sourceName: 'Manifeste de Paris',
  sourceUrl: 'https://parismanifesto.world',
  declaredAt: '2026-11-21',
  positions: [
    { positionId: onMedia.id, quote: mediaQuote },
    { positionId: onAi.id, quote: aiQuote },
  ],
}

describe('publishJointDeclarationUseCase', () => {
  it('asks to be signed in', async () => {
    const result = await execute(
      publishJointDeclarationUseCase({ ...newDeclaration, contributor: null }),
    )
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('names each field at fault', async () => {
    const result = await execute(
      publishJointDeclarationUseCase({
        ...newDeclaration,
        title: 'A',
        sourceUrl: '  ',
        declaredAt: '2999-01-01',
      }),
    )
    expect(Either.isLeft(result) && Object.keys(result.left)).toEqual([
      'title',
      'sourceUrl',
      'declaredAt',
    ])
  })

  it('refuses a title another joint declaration bears', async () => {
    const result = await runFormWith(fakes(fakeJointDeclarationRepo([sampleJointDeclaration()])))(
      publishJointDeclarationUseCase(newDeclaration),
    )
    expect(Either.isLeft(result) && result.left).toEqual({ title: JOINT_DECLARATION_TITLE_TAKEN })
  })

  it('refuses a source another joint declaration bears, however it is typed: the same page is the same text', async () => {
    const known = sampleJointDeclaration()
    const result = await runFormWith(fakes(fakeJointDeclarationRepo([known])))(
      publishJointDeclarationUseCase({
        ...newDeclaration,
        title: 'Un autre titre pour le même texte',
        sourceUrl: 'http://www.parismanifesto.world/',
      }),
    )
    expect(Either.isLeft(result) && result.left).toEqual({
      sourceUrl: sourceAlreadyReferenced(known),
    })
  })

  it('refuses a position the site does not know', async () => {
    const result = await execute(
      publishJointDeclarationUseCase({
        ...newDeclaration,
        positions: [{ positionId: 'unknown', quote: mediaQuote }],
      }),
    )
    expect(Either.isLeft(result) && result.left).toEqual({ positions: TAKEN_POSITION_NOT_FOUND })
  })

  it('refuses words too short to state a position', async () => {
    const result = await execute(
      publishJointDeclarationUseCase({
        ...newDeclaration,
        positions: [{ positionId: onMedia.id, quote: ' oui ' }],
      }),
    )
    expect(Either.isLeft(result) && result.left).toEqual({ positions: TAKEN_QUOTE_TOO_SHORT })
  })

  it('refuses two positions on the same subject', async () => {
    const result = await execute(
      publishJointDeclarationUseCase({
        ...newDeclaration,
        positions: [
          { positionId: onMedia.id, quote: mediaQuote },
          { positionId: otherOnMedia.id, quote: mediaQuote },
        ],
      }),
    )
    expect(Either.isLeft(result) && result.left).toEqual({ positions: SUBJECT_ALREADY_ENGAGED })
  })

  it('records the text and the positions it takes, each on the subject the position names', async () => {
    const unit = inMemoryUnitOfWork()
    const result = await execute(publishJointDeclarationUseCase(newDeclaration), unit.run)

    expect(Either.isRight(result) && result.right).toMatchObject({
      title: 'Le Manifeste de Paris',
      slug: 'le-manifeste-de-paris',
      createdBy: 'alice',
    })
    expect(unit.journal.all()).toMatchObject([
      { streamType: 'joint_declaration', type: 'JointDeclarationPublished', actorId: 'alice' },
      { type: 'PositionTaken', payload: takenOnMedia },
      { type: 'PositionTaken', payload: takenOnAi },
    ])
  })
})

describe('signJointDeclarationUseCase', () => {
  const declaration = sampleJointDeclaration()
  const seeded = (signatories = [] as ReturnType<typeof publicFigureAuthor>[]) =>
    journalWithJointDeclarations([
      declaration,
      { positions: [takenOnMedia, takenOnAi], signatories },
    ])
  const existing = (author: StatementAuthor) => ({ kind: 'existing' as const, author })
  const signature = {
    contributor,
    declarationId: declaration.id,
    author: existing(publicFigureAuthor(figure.id)),
  }

  it('asks to be signed in', async () => {
    const unit = await seeded()
    const result = await execute(
      signJointDeclarationUseCase({ ...signature, contributor: null }),
      unit.run,
    )
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('refuses a signatory the site does not know', async () => {
    const unit = await seeded()
    const result = await execute(
      signJointDeclarationUseCase({
        ...signature,
        author: existing(publicFigureAuthor('unknown')),
      }),
      unit.run,
    )
    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('refuses a joint declaration the journal does not know', async () => {
    const result = await execute(signJointDeclarationUseCase(signature))
    expect(Either.isLeft(result) && result.left).toBe('Déclaration commune introuvable.')
  })

  it('records the signature and one statement per position of the text, for one reward', async () => {
    const unit = await seeded()
    const before = unit.journal.all().length
    const result = await execute(signJointDeclarationUseCase(signature), unit.run)

    expect(Either.isRight(result) && result.right.statements).toHaveLength(2)
    expect(deedsIn(unit.journal).slice(before)).toMatchObject([
      {
        streamType: 'joint_declaration',
        streamId: declaration.id,
        type: 'SignatoryAdded',
        payload: { author: { kind: 'public_figure', id: figure.id } },
      },
      {
        streamType: 'statement',
        type: 'StatementAdded',
        actorId: 'alice',
        payload: {
          author: { kind: 'public_figure', id: figure.id },
          jointDeclarationId: declaration.id,
          subjectId: 'subject-media',
          positionId: onMedia.id,
          content: { kind: 'declaration', quote: mediaQuote },
          sourceName: 'Manifeste de Paris',
          sourceUrl: 'https://parismanifesto.world',
          statedAt: '2026-11-21',
          argumentIds: [],
        },
      },
      {
        streamType: 'statement',
        type: 'StatementAdded',
        payload: { jointDeclarationId: declaration.id, positionId: onAi.id },
      },
    ])
    expect(grantsIn(unit.journal)).toEqual([['alice', 'added_statement_validated', 50]])
  })

  it('lets an organisation sign', async () => {
    const unit = await seeded()
    const result = await execute(
      signJointDeclarationUseCase({
        ...signature,
        author: existing(organisationAuthor(organisation.id)),
      }),
      unit.run,
    )
    expect(Either.isRight(result) && result.right.statements[0].author).toEqual({
      kind: 'organisation',
      id: organisation.id,
    })
  })

  it('opens a signatory the site did not know, in the same breath as the signature', async () => {
    const unit = await seeded()
    const before = unit.journal.all().length
    const result = await execute(
      signJointDeclarationUseCase({
        ...signature,
        contributor: eloquent,
        author: {
          kind: 'new_figure',
          figure: {
            name: 'Julia Cagé',
            presentation: 'Économiste, professeure à Sciences Po.',
            wikipediaUrl: 'https://fr.wikipedia.org/wiki/Julia_Cag%C3%A9',
            websiteUrl: '',
            notorietySources: [],
          },
        },
      }),
      unit.run,
    )

    expect(Either.isRight(result)).toBe(true)
    const [opened, signed, ...statements] = deedsIn(unit.journal).slice(before)
    expect(opened).toMatchObject({ streamType: 'public_figure', type: 'PublicFigureAdded' })
    expect(signed).toMatchObject({
      type: 'SignatoryAdded',
      payload: { author: { kind: 'public_figure', id: opened.streamId } },
    })
    expect(statements.map((s) => (s.payload as { author: { id: string } }).author.id)).toEqual([
      opened.streamId,
      opened.streamId,
    ])
    expect(grantsIn(unit.journal)).toEqual([
      ['bob', 'added_personality_validated', 50],
      ['bob', 'added_statement_validated', 50],
    ])
  })

  it('refuses to open a signatory below the rank it takes, and writes nothing', async () => {
    const unit = await seeded()
    const before = unit.journal.all().length
    const result = await execute(
      signJointDeclarationUseCase({
        ...signature,
        author: {
          kind: 'new_figure',
          figure: {
            name: 'Julia Cagé',
            presentation: 'Économiste, professeure à Sciences Po.',
            wikipediaUrl: 'https://fr.wikipedia.org/wiki/Julia_Cag%C3%A9',
            websiteUrl: '',
            notorietySources: [],
          },
        },
      }),
      unit.run,
    )

    expect(Either.isLeft(result) && result.left).toContain('Éloquent')
    expect(unit.journal.all()).toHaveLength(before)
  })

  it('refuses a second signature of the same signatory, and writes nothing', async () => {
    const unit = await seeded([publicFigureAuthor(figure.id)])
    const before = unit.journal.all().length
    const result = await execute(signJointDeclarationUseCase(signature), unit.run)

    expect(Either.isLeft(result) && result.left).toEqual({ author: ALREADY_SIGNATORY })
    expect(unit.journal.all()).toHaveLength(before)
  })
})

describe('takeJointPositionUseCase', () => {
  const declaration = sampleJointDeclaration()
  const signatories = [publicFigureAuthor(figure.id), organisationAuthor(organisation.id)]
  const seeded = () =>
    journalWithJointDeclarations([declaration, { positions: [takenOnMedia], signatories }])
  const onOneMore = {
    contributor,
    declarationId: declaration.id,
    positionId: onAi.id,
    quote: ` ${aiQuote} `,
  }

  it('gives the new position to every signatory, and earns nothing', async () => {
    const unit = await seeded()
    const before = unit.journal.all().length
    const result = await execute(takeJointPositionUseCase(onOneMore), unit.run)

    expect(Either.isRight(result)).toBe(true)
    expect(unit.journal.all().slice(before)).toMatchObject([
      { streamType: 'joint_declaration', type: 'PositionTaken', payload: takenOnAi },
      {
        streamType: 'statement',
        type: 'StatementAdded',
        payload: {
          author: signatories[0],
          positionId: onAi.id,
          jointDeclarationId: declaration.id,
        },
      },
      {
        streamType: 'statement',
        type: 'StatementAdded',
        payload: {
          author: signatories[1],
          positionId: onAi.id,
          jointDeclarationId: declaration.id,
        },
      },
    ])
    expect(grantsIn(unit.journal)).toEqual([])
  })

  it('refuses a second position on a subject the text already engages, and writes nothing', async () => {
    const unit = await seeded()
    const before = unit.journal.all().length
    const result = await execute(
      takeJointPositionUseCase({ ...onOneMore, positionId: otherOnMedia.id }),
      unit.run,
    )

    expect(Either.isLeft(result) && result.left).toEqual({ positionId: SUBJECT_ALREADY_ENGAGED })
    expect(unit.journal.all()).toHaveLength(before)
  })

  it('refuses words too short to state the position', async () => {
    const unit = await seeded()
    const result = await execute(takeJointPositionUseCase({ ...onOneMore, quote: 'oui' }), unit.run)
    expect(Either.isLeft(result) && result.left).toEqual({ quote: TAKEN_QUOTE_TOO_SHORT })
  })
})
