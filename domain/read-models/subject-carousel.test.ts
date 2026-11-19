import { describe, expect, it } from 'vitest'
import { FamilyPositionMatrix, MatrixFamily } from '../services/occupation-distribution'
import {
  createOccupationFamily,
  createPosition,
  createStatement,
} from '../entities/entity-test-helpers'
import {
  contentLine,
  declarationContent,
  StatementContent,
  VOTE_CHOICES,
  voteContent,
} from '../entities/statement'
import { StatementAuthorRef } from './statement-author'
import {
  CarouselFamilies,
  CarouselSlide,
  CarouselStatement,
  SlideOf,
  subjectCarousel as carouselOf,
  toCarouselStatement,
  unquoted,
} from './subject-carousel'
import { ALL_CONTRADICTORY, Compatibility, compatibilityOf } from './position-judgements'

/** The carousel of a subject nobody judged the positions of, unless the test says what was judged */
const subjectCarousel = (
  statements: CarouselStatement[],
  families: CarouselFamilies,
  compatible: Compatibility = ALL_CONTRADICTORY,
) => carouselOf(statements, families, compatible)

const figure = (name: string): StatementAuthorRef => ({
  kind: 'public_figure',
  id: name,
  name,
  slug: name.toLowerCase(),
  acronym: null,
})

const organisation = (name: string): StatementAuthorRef => ({
  kind: 'organisation',
  id: name,
  name,
  slug: name.toLowerCase(),
  acronym: name,
})

const position = (title: string) => ({ id: title, title, slug: title.toLowerCase() })

const said = (
  author: StatementAuthorRef,
  on: string,
  day: string,
  quote: string | null = `${author.name} sur ${on}`,
): CarouselStatement => ({
  author,
  position: position(on),
  statedAt: new Date(day),
  createdAt: new Date(day),
  ...(quote === null ? {} : { quote }),
  line: quote ?? 'A voté pour',
  typeLabel: quote === null ? 'Vote' : 'Déclaration',
  sourceName: 'Le Journal',
})

const NO_FAMILIES: CarouselFamilies = {
  matrix: { positions: [], families: [], overall: { total: 0, cells: [] } },
  byFigure: new Map(),
}

const kinds = (slides: CarouselSlide[]) => slides.map((slide) => slide.kind)
const only = <K extends CarouselSlide['kind']>(slides: CarouselSlide[], kind: K): SlideOf<K> => {
  const found = slides.filter((slide): slide is SlideOf<K> => slide.kind === kind)
  expect(found).toHaveLength(1)
  return found[0]
}

describe('subjectCarousel', () => {
  it('has no slide for a subject nobody spoke on', () => {
    expect(subjectCarousel([], NO_FAMILIES)).toEqual([])
  })

  it('opens on the cover and closes on the call, with the ranking and one slide of faces per position', () => {
    const slides = subjectCarousel(
      [
        said(figure('Ada'), 'Pour', '2024-01-01'),
        said(figure('Bob'), 'Pour', '2024-02-01'),
        said(figure('Cléo'), 'Contre', '2024-03-01', null),
      ],
      NO_FAMILIES,
    )

    expect(kinds(slides)).toEqual(['cover', 'ranking', 'faces', 'faces', 'quote', 'call'])
    expect(slides.map((slide) => slide.key)).toEqual([
      'couverture',
      'classement',
      'visages-pour',
      'visages-contre',
      'citation',
      'contribuer',
    ])
  })

  it('counts each author once per position, and ranks the positions by voices', () => {
    const slides = subjectCarousel(
      [
        said(figure('Ada'), 'Contre', '2023-01-01'),
        said(figure('Ada'), 'Contre', '2024-01-01'),
        said(figure('Bob'), 'Pour', '2024-02-01'),
        said(organisation('ONG'), 'Pour', '2024-03-01'),
      ],
      NO_FAMILIES,
    )

    expect(only(slides, 'ranking').rows).toEqual([
      { title: 'Pour', count: 2, figures: 1, organisations: 1, share: 1 },
      { title: 'Contre', count: 1, figures: 1, organisations: 0, share: 0.5 },
    ])
    expect(only(slides, 'cover')).toMatchObject({
      figures: 2,
      organisations: 1,
      statements: 4,
      span: { from: 2023, to: 2024 },
    })
  })

  it('shows eight faces and a count when a position has more than nine voices', () => {
    const crowd = Array.from({ length: 12 }, (_, i) =>
      said(figure(`F${i}`), 'Pour', `2024-01-${String(i + 1).padStart(2, '0')}`),
    )
    const [slide] = subjectCarousel(crowd, NO_FAMILIES).filter((s) => s.kind === 'faces')

    expect(slide).toMatchObject({ count: 12, more: 4 })
    expect(slide.kind === 'faces' && slide.faces).toHaveLength(8)
  })

  describe('the quote', () => {
    it('is the latest words of the most supported position', () => {
      const slides = subjectCarousel(
        [
          said(figure('Ada'), 'Pour', '2022-01-01', 'Ancienne'),
          said(figure('Bob'), 'Pour', '2024-01-01', 'Récente'),
          said(figure('Cléo'), 'Contre', '2025-01-01', 'Plus récente, mais minoritaire'),
        ],
        NO_FAMILIES,
      )

      expect(only(slides, 'quote').quote).toMatchObject({ quote: 'Récente', position: 'Pour' })
    })

    it('skips a vote, which has no words, and words too long to be set', () => {
      const slides = subjectCarousel(
        [
          said(figure('Ada'), 'Pour', '2022-01-01', 'Courte'),
          said(figure('Bob'), 'Pour', '2023-01-01', 'x'.repeat(301)),
          said(figure('Cléo'), 'Pour', '2024-01-01', null),
        ],
        NO_FAMILIES,
      )

      expect(only(slides, 'quote').quote.quote).toBe('Courte')
    })

    it('is left out when the leading position has no words', () => {
      const slides = subjectCarousel([said(figure('Ada'), 'Pour', '2024-01-01', null)], NO_FAMILIES)

      expect(kinds(slides)).not.toContain('quote')
    })
  })

  describe('the face-off', () => {
    it('sets the two leading positions against each other in the latest year both spoke', () => {
      const slides = subjectCarousel(
        [
          said(figure('Ada'), 'Pour', '2025-06-01', 'Pour, seule en 2025'),
          said(figure('Ada'), 'Pour', '2023-06-01', 'Pour en 2023'),
          said(figure('Bob'), 'Pour', '2021-06-01', 'Pour en 2021'),
          said(figure('Cléo'), 'Contre', '2023-02-01', 'Contre en 2023'),
          said(figure('Dan'), 'Contre', '2021-02-01', 'Contre en 2021'),
          said(figure('Eve'), 'Ailleurs', '2025-02-01', 'Troisième position'),
        ],
        NO_FAMILIES,
      )

      const slide = only(slides, 'face-off')
      expect(slide.year).toBe(2023)
      expect(slide.quotes.map((q) => q.quote)).toEqual(['Pour en 2023', 'Contre en 2023'])
    })

    it('never opposes an author to herself', () => {
      const ada = figure('Ada')
      const slides = subjectCarousel(
        [
          said(ada, 'Pour', '2024-06-01'),
          said(figure('Bob'), 'Pour', '2020-06-01'),
          said(ada, 'Contre', '2024-02-01'),
        ],
        NO_FAMILIES,
      )

      expect(kinds(slides)).not.toContain('face-off')
    })

    it('is left out when no year has words on both sides', () => {
      const slides = subjectCarousel(
        [said(figure('Ada'), 'Pour', '2024-06-01'), said(figure('Bob'), 'Contre', '2023-06-01')],
        NO_FAMILIES,
      )

      expect(kinds(slides)).not.toContain('face-off')
    })
  })

  it('tells the journey of the latest public figure who changed position, in her two statements', () => {
    const ada = figure('Ada')
    const slides = subjectCarousel(
      [
        said(ada, 'Contre', '2022-02-09', 'Je suis contre'),
        said(ada, 'Pour', '2026-09-09', null),
        said(figure('Bob'), 'Pour', '2024-01-01'),
      ],
      NO_FAMILIES,
    )

    expect(only(slides, 'journey')).toMatchObject({
      figure: ada,
      from: { position: 'Contre', line: 'Je suis contre', worded: true },
      to: { position: 'Pour', line: 'A voté pour', worded: false, typeLabel: 'Vote' },
    })
  })

  it('tells no journey between two positions judged compatible: she holds both', () => {
    const ada = figure('Ada')
    const slides = subjectCarousel(
      [said(ada, 'Contre', '2022-02-09'), said(ada, 'Pour', '2026-09-09')],
      NO_FAMILIES,
      compatibilityOf([{ positionIds: ['Contre', 'Pour'], compatible: true }]),
    )

    expect(kinds(slides)).not.toContain('journey')
  })

  it('lists the organisations under their positions from two of them, never a single one', () => {
    const one = subjectCarousel(
      [said(figure('Ada'), 'Pour', '2024-01-01'), said(organisation('ONG'), 'Pour', '2024-02-01')],
      NO_FAMILIES,
    )
    const two = subjectCarousel(
      [
        said(organisation('ONG'), 'Pour', '2024-02-01'),
        said(organisation('ONG'), 'Pour', '2025-02-01', null),
        said(organisation('Parti'), 'Contre', '2023-02-01'),
      ],
      NO_FAMILIES,
    )

    expect(kinds(one)).not.toContain('organisations')
    expect(only(two, 'organisations')).toMatchObject({
      count: 2,
      more: 0,
      groups: [
        { position: 'Pour', entries: [{ statedAt: new Date('2025-02-01'), typeLabel: 'Vote' }] },
        { position: 'Contre', entries: [{ typeLabel: 'Déclaration' }] },
      ],
    })
  })

  describe('the curves', () => {
    it('add a voice the year it first spoke for a position, and keep it', () => {
      const slides = subjectCarousel(
        [
          said(figure('Ada'), 'Pour', '2020-01-01'),
          said(figure('Ada'), 'Pour', '2022-01-01'),
          said(figure('Bob'), 'Pour', '2023-01-01'),
          said(figure('Cléo'), 'Contre', '2021-01-01'),
        ],
        NO_FAMILIES,
      )

      expect(only(slides, 'curves')).toMatchObject({
        from: 2020,
        to: 2023,
        lines: [
          { title: 'Pour', points: [1, 1, 1, 2] },
          { title: 'Contre', points: [0, 1, 1, 1] },
        ],
      })
    })

    it('are left out under four years with statements', () => {
      const slides = subjectCarousel(
        [
          said(figure('Ada'), 'Pour', '2020-01-01'),
          said(figure('Bob'), 'Contre', '2021-01-01'),
          said(figure('Cléo'), 'Contre', '2022-01-01'),
        ],
        NO_FAMILIES,
      )

      expect(kinds(slides)).not.toContain('curves')
    })
  })

  describe('the balance', () => {
    const yearOf = (i: number) => 2015 + Math.floor(i / 4)
    const many = Array.from({ length: 24 }, (_, i) =>
      said(figure(`F${i}`), i < 8 || i % 2 === 0 ? 'Pour' : 'Contre', `${yearOf(i)}-01-01`),
    )

    it('gathers the years into periods of about as many statements, with the share of each position', () => {
      const slide = only(subjectCarousel(many, NO_FAMILIES), 'balance')

      expect(slide.positions).toEqual(['Pour', 'Contre'])
      expect(slide.periods).toEqual([
        { from: 2015, to: 2016, shares: [1, 0] },
        { from: 2017, to: 2018, shares: [0.5, 0.5] },
        { from: 2019, to: 2020, shares: [0.5, 0.5] },
      ])
    })

    it('is left out when the statements cannot fill three periods', () => {
      expect(kinds(subjectCarousel(many.slice(0, 23), NO_FAMILIES))).not.toContain('balance')
    })
  })

  describe('the families of occupations', () => {
    const family = (name: string) =>
      createOccupationFamily({ name, description: '', position: 0, createdBy: 'test' })
    const row = (name: string, counts: number[], overall: number[]): MatrixFamily => {
      const total = counts.reduce((a, b) => a + b, 0)
      return {
        family: family(name),
        total,
        small: total < 3,
        cells: counts.map((count, i) => ({
          count,
          share: count / total,
          deviation: count / total - overall[i],
        })),
      }
    }
    const matrixOf = (rows: Array<[string, number[]]>): FamilyPositionMatrix => {
      const overall = [0.5, 0.5]
      return {
        positions: [
          { id: 'Pour', title: 'Pour', count: 10, share: 0.5 },
          { id: 'Contre', title: 'Contre', count: 10, share: 0.5 },
        ],
        families: rows.map(([name, counts]) => row(name, counts, overall)),
        overall: {
          total: 20,
          cells: overall.map((share) => ({ count: 10, share, deviation: 0 })),
        },
      }
    }
    const statements = [
      said(figure('Ada'), 'Pour', '2024-01-01'),
      said(figure('Bob'), 'Contre', '2024-01-02'),
    ]

    it('compares the largest families that are not too small to the whole', () => {
      const matrix = matrixOf([
        ['Élus', [6, 6]],
        ['Juristes', [1, 1]],
        ['Chercheurs', [3, 1]],
      ])
      const slide = only(subjectCarousel(statements, { matrix, byFigure: new Map() }), 'families')

      expect(slide.positions).toEqual(['Pour', 'Contre'])
      expect(slide.rows).toEqual([
        { name: 'Élus', total: 12, shares: [0.5, 0.5] },
        { name: 'Chercheurs', total: 4, shares: [0.75, 0.25] },
      ])
    })

    it('gives a sheet to the family furthest from the whole, then to the largest, from ten voices each', () => {
      const matrix = matrixOf([
        ['Élus', [10, 10]],
        ['Chercheurs', [9, 1]],
        ['Juristes', [9, 0]],
      ])
      const byFigure = new Map([['Ada', new Set([matrix.families[1].family.id as string])]])
      const sheets = subjectCarousel(statements, { matrix, byFigure }).filter(
        (slide) => slide.kind === 'family',
      )

      expect(sheets.map((sheet) => sheet.family)).toEqual(['Chercheurs', 'Élus'])
      expect(sheets[0]).toMatchObject({
        total: 10,
        leading: { position: 'Pour', count: 9, faces: [figure('Ada')] },
        rows: [
          { position: 'Pour', share: 0.9, overall: 0.5 },
          { position: 'Contre', share: 0.1, overall: 0.5 },
        ],
      })
    })

    it('gives one sheet when the furthest family is also the largest', () => {
      const matrix = matrixOf([['Chercheurs', [18, 2]]])
      const sheets = subjectCarousel(statements, { matrix, byFigure: new Map() }).filter(
        (slide) => slide.kind === 'family',
      )

      expect(sheets).toHaveLength(1)
    })

    it('never names the positions folded together as the one a family leans to', () => {
      const matrix = matrixOf([['Chercheurs', [4, 8]]])
      const folded: FamilyPositionMatrix = {
        ...matrix,
        positions: [matrix.positions[0], { ...matrix.positions[1], id: 'others', title: 'Autres' }],
      }
      const [sheet] = subjectCarousel(statements, { matrix: folded, byFigure: new Map() }).filter(
        (slide) => slide.kind === 'family',
      )

      expect(sheet.leading).toMatchObject({ position: 'Pour', count: 4 })
    })
  })
})

describe('unquoted', () => {
  it('drops the quotation marks the words were entered with', () => {
    expect(unquoted('« Il faut sortir du nucléaire. »')).toBe('Il faut sortir du nucléaire.')
    expect(unquoted('"Il faut sortir du nucléaire."')).toBe('Il faut sortir du nucléaire.')
    expect(unquoted('“Il faut sortir du nucléaire.”')).toBe('Il faut sortir du nucléaire.')
  })

  it('leaves alone words that only quote somebody along the way', () => {
    expect(unquoted('Il a dit « non » puis il est parti')).toBe(
      'Il a dit « non » puis il est parti',
    )
    expect(unquoted('« Non », a-t-il dit')).toBe('« Non », a-t-il dit')
    expect(unquoted('« Oui » et « non »')).toBe('« Oui » et « non »')
  })
})

describe('an organisation that took two positions', () => {
  it('is listed under each and counted once', () => {
    const slides = subjectCarousel(
      [
        said(organisation('ONG'), 'Pour', '2020-02-01'),
        said(organisation('ONG'), 'Contre', '2024-02-01'),
        said(organisation('Parti'), 'Contre', '2023-02-01'),
      ],
      NO_FAMILIES,
    )
    const slide = slides.find((s) => s.kind === 'organisations')

    expect(slide).toMatchObject({ count: 2, more: 0 })
    expect(slide?.kind === 'organisations' && slide.groups.map((g) => g.entries.length)).toEqual([
      2, 1,
    ])
  })

  it('does not make a slide alone', () => {
    const slides = subjectCarousel(
      [
        said(organisation('ONG'), 'Pour', '2020-02-01'),
        said(organisation('ONG'), 'Contre', '2024-02-01'),
      ],
      NO_FAMILIES,
    )

    expect(slides.map((s) => s.kind)).not.toContain('organisations')
  })
})

describe('toCarouselStatement', () => {
  const position = createPosition({
    title: 'Pour',
    description: 'Une position de test',
    subjectId: 's',
  })
  const author = figure('Ada')
  const stated = (content: StatementContent) => ({
    statement: createStatement({
      author: { kind: 'public_figure', id: author.id },
      positionId: position.id,
      content,
      sourceName: 'Le Journal',
      sourceUrl: 'https://example.org',
      statedAt: new Date('2024-01-01'),
    }),
    position,
    author,
    arguments: [],
  })

  it('reads the words of a declaration without the marks they were entered with', () => {
    expect(toCarouselStatement(stated(declarationContent('« Je suis pour. »')))).toMatchObject({
      quote: 'Je suis pour.',
      line: 'Je suis pour.',
      typeLabel: 'Déclaration',
      position: { title: 'Pour', slug: 'pour' },
    })
  })

  it('gives a vote no words of its own, and names it as the fact it is', () => {
    const content = voteContent('Projet de loi', VOTE_CHOICES[0])
    const read = toCarouselStatement(stated(content))

    expect(read.quote).toBeUndefined()
    expect(read.line).toBe(contentLine(content))
    expect(read.typeLabel).toBe('Vote')
  })
})
