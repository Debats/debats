import { describe, it, expect } from 'vitest'
import { Option } from 'effect'
import {
  FamilyRef,
  FigureIndexEntry,
  FigureIndexSection,
  figureIndexHref,
  figureIndexTotals,
  parseFigureIndexView,
  figuresByDocumentation,
  figuresToDocument,
  groupFiguresByFamily,
  parseRankedPages,
} from './figure-index'

const today = new Date('2026-11-13T10:00:00Z')

const family = (name: string, position: number): FamilyRef => ({
  id: `family-${name}`,
  name,
  slug: name.toLowerCase(),
  position,
})

const executive = family('Exécutif', 1)
const national = family('Élu·e national·e', 2)
const party = family('Responsable politique', 4)
const sport = family('Sport', 15)
const clergy = family('Religieux', 14)

const holds = (name: string, of: FamilyRef) => ({ name, isCurrent: true, family: of })
const held = (name: string, of: FamilyRef) => ({ name, isCurrent: false, family: of })

const member = (name: string, acronym: string | null = null, endedOn?: string) => ({
  organisation: { name, acronym, slug: name.toLowerCase() },
  endedOn: endedOn ? Option.some(new Date(endedOn)) : Option.none<Date>(),
})

const figure = (
  name: string,
  subjectsCount: number,
  occupations: FigureIndexEntry['occupations'] = [],
  affiliations: FigureIndexEntry['affiliations'] = [],
  statementsCount = subjectsCount,
): FigureIndexEntry => ({
  id: `figure-${name}`,
  name,
  slug: name.toLowerCase(),
  presentation: '',
  statementsCount,
  subjectsCount,
  latestStatementAt: subjectsCount > 0 ? new Date('2026-03-01') : null,
  occupations,
  affiliations,
})

/** Enough deputies for the family to stand on its own */
const deputies = (count: number, subjects = 1) =>
  Array.from({ length: count }, (_, i) =>
    figure(`Député ${String(i + 1).padStart(2, '0')}`, subjects, [holds('Député·e', national)]),
  )

const names = (section: FigureIndexSection) => section.figures.map((f) => f.name)
const sectionOf = (sections: FigureIndexSection[], of: FamilyRef) =>
  sections.find((s) => s.kind === 'family' && s.family.id === of.id)

describe('groupFiguresByFamily', () => {
  const ministers = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      figure(`Ministre ${i}`, 1, [holds('Ministre', executive)]),
    )
  const familyNames = (sections: FigureIndexSection[]) =>
    sections.map((s) => (s.kind === 'family' ? s.family.name : s.kind))

  it('opens one section per family, the family with the most members first', () => {
    const sections = groupFiguresByFamily([...ministers(6), ...deputies(9)], today)

    expect(familyNames(sections)).toEqual(['Élu·e national·e', 'Exécutif'])
  })

  it('counts who held the occupation before as a member, as the bar of families does', () => {
    const former = Array.from({ length: 4 }, (_, i) =>
      figure(`Ancien ministre ${i}`, 1, [held('Ministre', executive)]),
    )
    const sections = groupFiguresByFamily([...ministers(6), ...former, ...deputies(9)], today)

    expect(familyNames(sections)).toEqual(['Exécutif', 'Élu·e national·e'])
  })

  it('keeps the order of the families between two that have as many members', () => {
    const sections = groupFiguresByFamily([...deputies(6), ...ministers(6)], today)

    expect(familyNames(sections)).toEqual(['Exécutif', 'Élu·e national·e'])
  })

  it('counts every member of the family but shows six of them', () => {
    const [section] = groupFiguresByFamily(deputies(9), today)

    expect(section.total).toBe(9)
    expect(section.figures).toHaveLength(6)
  })

  it('puts who holds the occupation today first, then who covers the most subjects', () => {
    const entries = [
      ...deputies(4),
      figure('Ancienne', 30, [held('Député·e', national)]),
      figure('Discrète', 2, [holds('Sénateur·rice', national)]),
      figure('Prolixe', 12, [holds('Député·e', national)]),
    ]
    const [section] = groupFiguresByFamily(entries, today)

    expect(names(section).slice(0, 2)).toEqual(['Prolixe', 'Discrète'])
    expect(names(section)).not.toContain('Ancienne')
  })

  it('shows a face once: who appeared in an earlier family leaves her place', () => {
    const both = figure('Cheffe et députée', 40, [
      holds('Député·e', national),
      holds('Chef·fe de parti', party),
    ])
    const leaders = Array.from({ length: 6 }, (_, i) =>
      figure(`Chef ${i}`, 1, [holds('Chef·fe de parti', party)]),
    )
    const sections = groupFiguresByFamily([both, ...deputies(8), ...leaders], today)

    expect(familyNames(sections)).toEqual(['Élu·e national·e', 'Responsable politique'])
    expect(names(sectionOf(sections, national)!)).toContain('Cheffe et députée')
    expect(names(sectionOf(sections, party)!)).not.toContain('Cheffe et députée')
    expect(sectionOf(sections, party)!.figures).toHaveLength(6)
    expect(sectionOf(sections, party)!.total).toBe(7)
  })

  it('names under a figure what she does in the family and where she belongs today', () => {
    const entries = [
      figure(
        'Marine',
        33,
        [holds('Député·e', national), held('Député·e européen·ne', national)],
        [member('Rassemblement national', 'RN'), member('Front national', 'FN', '2018-06-01')],
      ),
      figure('Jean-Luc', 3, [held('Sénateur·rice', national), held('Député·e', national)]),
      ...deputies(4),
    ]
    const [section] = groupFiguresByFamily(entries, today)

    expect(section.figures[0].role).toBe('Député·e · RN')
    expect(section.figures.find((f) => f.name === 'Jean-Luc')?.role).toBe(
      'ex-Sénateur·rice, ex-Député·e',
    )
  })

  it('gathers the families of fewer than six members in one section, after the others', () => {
    const entries = [
      figure('Teddy', 4, [holds('Sportif·ve', sport)]),
      figure('Patrick', 1, [holds('Responsable religieux·se', clergy)]),
      ...deputies(6),
    ]
    const sections = groupFiguresByFamily(entries, today)

    expect(sections.map((s) => s.kind)).toEqual(['family', 'others'])
    const others = sections[1]
    expect(others.kind === 'others' && others.families.map((f) => f.name)).toEqual([
      'Religieux',
      'Sport',
    ])
    expect(names(others)).toEqual(['Teddy', 'Patrick'])
    expect(others.figures[0].role).toBe('Sportif·ve')
  })

  it('closes on the figures no occupation is known for', () => {
    const unknown = Array.from({ length: 8 }, (_, i) => figure(`Inconnue ${i}`, 1))
    const affiliated = figure('Affiliée', 2, [], [member('Les Écologistes', 'EELV')])
    const sections = groupFiguresByFamily([...unknown, affiliated, ...deputies(6)], today)

    const last = sections[sections.length - 1]
    expect(last.kind).toBe('unassigned')
    expect(last.total).toBe(9)
    expect(last.figures[0]).toMatchObject({ name: 'Affiliée', role: 'EELV' })
  })

  it('counts every figure without an occupation but shows six, like a family', () => {
    const unknown = Array.from({ length: 9 }, (_, i) => figure(`Inconnue ${i}`, 9 - i))
    const sections = groupFiguresByFamily(unknown, today)

    expect(sections[0]).toMatchObject({ kind: 'unassigned', total: 9 })
    expect(names(sections[0])).toEqual([
      'Inconnue 0',
      'Inconnue 1',
      'Inconnue 2',
      'Inconnue 3',
      'Inconnue 4',
      'Inconnue 5',
    ])
  })

  it('drops a family whose members were all shown above', () => {
    const everywhere = Array.from({ length: 6 }, (_, i) =>
      figure(`Cumul ${i}`, 5, [holds('Ministre', executive), holds('Député·e', national)]),
    )
    const sections = groupFiguresByFamily(everywhere, today)

    expect(sections).toHaveLength(1)
    expect(sections[0].kind === 'family' && sections[0].family.name).toBe('Exécutif')
  })
})

describe('figureIndexTotals', () => {
  it('counts the figures, their statements and the families they belong to', () => {
    const entries = [
      figure('A', 3, [holds('Député·e', national), held('Ministre', executive)], [], 5),
      figure('B', 1, [holds('Député·e', national)]),
      figure('C', 0),
    ]

    expect(figureIndexTotals(entries)).toEqual({ figures: 3, statements: 6, families: 2 })
  })
})

describe('figuresByDocumentation', () => {
  it('ranks by subjects, then by statements, and measures each against the first', () => {
    const entries = [
      figure('Deuxième', 10, [], [], 10),
      figure('Première', 20, [], [], 25),
      figure('Troisième', 10, [], [], 8),
    ]
    const ranked = figuresByDocumentation(entries, today)

    expect(ranked.map((f) => [f.name, f.rank, f.share])).toEqual([
      ['Première', 1, 1],
      ['Deuxième', 2, 0.5],
      ['Troisième', 3, 0.5],
    ])
    expect(ranked[0]).toMatchObject({ statementsCount: 25 })
  })

  it('names the first occupation held today, or the first one held before', () => {
    const entries = [
      figure('En poste', 2, [holds('Chef·fe de parti', party), holds('Député·e', national)]),
      figure('Retirée', 1, [held('Premier·ère ministre', executive)], [member('LFH')]),
    ]
    const ranked = figuresByDocumentation(entries, today)

    expect(ranked.map((f) => f.role)).toEqual(['Député·e', 'ex-Premier·ère ministre · LFH'])
  })

  it('has no share to draw when nobody said anything', () => {
    expect(figuresByDocumentation([figure('Muette', 0)], today)[0].share).toBe(0)
  })
})

describe('figuresToDocument', () => {
  const entries = [
    figure('Documentée', 5),
    figure('Alma', 1),
    figure('Bruno', 1),
    figure('Chloé', 0),
    figure('David', 1),
  ]

  it('keeps who has one statement at most, by name', () => {
    expect(figuresToDocument(entries, 0, 5).map((f) => f.name)).toEqual([
      'Alma',
      'Bruno',
      'Chloé',
      'David',
    ])
  })

  it('starts where it is told and goes round, so the list turns from day to day', () => {
    expect(figuresToDocument(entries, 3, 2).map((f) => f.name)).toEqual(['David', 'Alma'])
    expect(figuresToDocument(entries, 6, 2).map((f) => f.name)).toEqual(['Chloé', 'David'])
  })

  it('is empty when every figure is documented', () => {
    expect(figuresToDocument([figure('Documentée', 5)], 3, 2)).toEqual([])
  })
})

describe('parseRankedPages', () => {
  it('reads how many pages are shown, one by default', () => {
    expect(parseRankedPages(undefined)).toBe(1)
    expect(parseRankedPages('3')).toBe(3)
  })

  it('falls back to one page on anything else', () => {
    expect(parseRankedPages('0')).toBe(1)
    expect(parseRankedPages('-2')).toBe(1)
    expect(parseRankedPages('1.5')).toBe(1)
    expect(parseRankedPages('abc')).toBe(1)
  })
})

describe('the view the address carries', () => {
  it('is by occupation unless the address asks for the ranking', () => {
    expect(parseFigureIndexView(undefined)).toBe('families')
    expect(parseFigureIndexView('documentees')).toBe('ranking')
    expect(parseFigureIndexView('autre')).toBe('families')
  })

  it('writes the address of each view, the default one bare', () => {
    expect(figureIndexHref('families')).toBe('/p')
    expect(figureIndexHref('ranking')).toBe('/p?vue=documentees')
    expect(figureIndexHref('ranking', 3)).toBe('/p?vue=documentees&page=3')
  })
})
