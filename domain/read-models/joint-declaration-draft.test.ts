import { describe, expect, it } from 'vitest'
import { draftPublicFigureAuthor } from '../entities/draft-statement'
import { declarationContent } from '../entities/statement'
import { makeDraft } from '../use-cases/draft-test-helpers'
import { DraftResolution } from '../use-cases/resolve-draft'
import { ReviewableDraft } from './chantier-sections'
import { draftedDeclarations } from './joint-declaration-draft'

const found = { found: true as const, entity: { id: 'x', title: 'x', slug: 'x', name: 'x' } }
const toCreate = { found: false as const, canCreate: true }

const MANIFESTO = 'https://parismanifesto.world'

type Signed = {
  id: string
  who: string
  subject: string
  position: string
  quote?: string
  sourceUrl?: string
  title?: string
  authorKnown?: boolean
  canValidate?: boolean
}

const signature = ({
  id,
  who,
  subject,
  position,
  quote = `Ce que le texte dit sur ${subject}`,
  sourceUrl = MANIFESTO,
  title = 'Le Manifeste de Paris',
  authorKnown = true,
  canValidate = true,
}: Signed): ReviewableDraft => ({
  draft: makeDraft({
    id,
    author: draftPublicFigureAuthor(who),
    content: declarationContent(quote),
    subjectTitle: subject,
    positionTitle: position,
    sourceUrl,
    sourceName: 'Manifeste de Paris',
    date: '2026-11-20',
    jointDeclaration: { title, presentation: 'Un manifeste signé à plusieurs.' },
  }),
  resolution: {
    author: authorKnown ? found : toCreate,
    subject: found,
    position: toCreate,
    arguments: [],
    occupations: [],
    affiliations: [],
    canValidate,
  } as DraftResolution,
})

const own = (id: string): ReviewableDraft => ({
  draft: makeDraft({ id }),
  resolution: { author: found, subject: found, position: found, canValidate: true } as never,
})

describe('draftedDeclarations', () => {
  it('leaves a draft that signs nothing among the others', () => {
    const { declarations, others } = draftedDeclarations([own('d1')])

    expect(declarations).toEqual([])
    expect(others.map(({ draft }) => draft.id)).toEqual(['d1'])
  })

  it('reads the signatures of one text as one declaration: each position once, each signatory once', () => {
    const { declarations, others } = draftedDeclarations([
      signature({ id: 'd1', who: 'Julia Cagé', subject: 'Les médias', position: 'Indépendance' }),
      signature({ id: 'd2', who: 'Julia Cagé', subject: 'La taxe Zucman', position: 'Pour' }),
      signature({
        id: 'd3',
        who: 'Dominique Méda',
        subject: 'Les médias',
        position: 'Indépendance',
      }),
      own('d4'),
    ])

    expect(others.map(({ draft }) => draft.id)).toEqual(['d4'])
    expect(declarations).toHaveLength(1)
    const [text] = declarations
    expect(text.title).toBe('Le Manifeste de Paris')
    expect(text.presentation).toBe('Un manifeste signé à plusieurs.')
    expect(text.sourceUrl).toBe(MANIFESTO)
    expect(text.date).toBe('2026-11-20')
    expect(
      text.positions.map(({ subjectTitle, positionTitle }) => [subjectTitle, positionTitle]),
    ).toEqual([
      ['Les médias', 'Indépendance'],
      ['La taxe Zucman', 'Pour'],
    ])
    expect(text.positions[0].quote).toBe('Ce que le texte dit sur Les médias')
    expect(text.signatories.map(({ author }) => author.name)).toEqual([
      'Julia Cagé',
      'Dominique Méda',
    ])
    expect(text.items.map(({ draft }) => draft.id)).toEqual(['d1', 'd2', 'd3'])
  })

  it('tells a signatory the site knows from one the validation would create', () => {
    const [text] = draftedDeclarations([
      signature({ id: 'd1', who: 'Julia Cagé', subject: 'Les médias', position: 'Indépendance' }),
      signature({
        id: 'd2',
        who: 'Eva Illouz',
        subject: 'Les médias',
        position: 'Indépendance',
        authorKnown: false,
      }),
    ]).declarations

    expect(text.signatories.map(({ resolution }) => resolution.found)).toEqual([true, false])
  })

  it('gathers by the page the text is read on, whatever title each draft gives it', () => {
    const { declarations } = draftedDeclarations([
      signature({
        id: 'd1',
        who: 'A',
        subject: 'S',
        position: 'P',
        title: 'Le Manifeste de Paris',
      }),
      signature({ id: 'd2', who: 'B', subject: 'S', position: 'P', title: 'Manifeste de Paris' }),
      signature({
        id: 'd3',
        who: 'C',
        subject: 'S',
        position: 'P',
        sourceUrl: 'https://hiatus.ooo',
      }),
    ])

    expect(declarations.map(({ items }) => items.map(({ draft }) => draft.id))).toEqual([
      ['d1', 'd2'],
      ['d3'],
    ])
    expect(declarations[0].title).toBe('Le Manifeste de Paris')
  })

  it('names the subjects the drafts give two positions on: a text speaks once per subject', () => {
    const [text] = draftedDeclarations([
      signature({ id: 'd1', who: 'A', subject: 'Les médias', position: 'Indépendance' }),
      signature({ id: 'd2', who: 'B', subject: 'Les médias', position: 'Nationalisation' }),
    ]).declarations

    expect(text.contested).toEqual(['Les médias'])
    expect(text.canValidate).toBe(false)
  })

  it('can be validated only when each of its drafts can', () => {
    const ready = draftedDeclarations([
      signature({ id: 'd1', who: 'A', subject: 'S', position: 'P' }),
    ]).declarations[0]
    const stuck = draftedDeclarations([
      signature({ id: 'd1', who: 'A', subject: 'S', position: 'P' }),
      signature({ id: 'd2', who: 'B', subject: 'S', position: 'P', canValidate: false }),
    ]).declarations[0]

    expect(ready.canValidate).toBe(true)
    expect(stuck.canValidate).toBe(false)
  })
})
