import { describe, it, expect } from 'vitest'
import { Option } from 'effect'
import { FigureIndexEntry } from './figure-index'
import { figureSpotlight, SpotlightStatement } from './figure-spotlight'

const today = new Date('2026-11-13T10:00:00Z')

const elected = {
  id: 'f-national',
  name: 'Élu·e national·e',
  slug: 'elu-e-national-e',
  position: 2,
}
const research = { id: 'f-research', name: 'Chercheur·se', slug: 'chercheur-se', position: 7 }

const sandrine: FigureIndexEntry = {
  id: 'figure-1',
  name: 'Sandrine Rousseau',
  slug: 'sandrine-rousseau',
  presentation: 'Députée écologiste de Paris, économiste.',
  statementsCount: 5,
  subjectsCount: 4,
  latestStatementAt: new Date('2026-10-20'),
  occupations: [
    { name: 'Économiste', isCurrent: false, family: research },
    { name: 'Député·e', isCurrent: true, family: elected },
  ],
  affiliations: [
    {
      organisation: { name: 'Les Verts', acronym: null, slug: 'les-verts' },
      endedOn: Option.some(new Date('2010-11-13')),
    },
    {
      organisation: { name: 'Les Écologistes', acronym: 'EELV', slug: 'les-ecologistes' },
      endedOn: Option.none(),
    },
  ],
}

const said = (
  statedAt: string,
  subject: string,
  positionTitle: string,
  quote?: string,
): SpotlightStatement => ({
  statedAt: new Date(statedAt),
  quote,
  sourceName: `Source du ${statedAt}`,
  subject: { title: subject, slug: subject.toLowerCase() },
  positionTitle,
})

describe('figureSpotlight', () => {
  it('presents the figure with her counts', () => {
    expect(figureSpotlight(sandrine, [], today)).toMatchObject({
      name: 'Sandrine Rousseau',
      slug: 'sandrine-rousseau',
      presentation: 'Députée écologiste de Paris, économiste.',
      statementsCount: 5,
      subjectsCount: 4,
    })
  })

  it('lists what she holds today before what she held, each with its family', () => {
    expect(figureSpotlight(sandrine, [], today).occupations).toEqual([
      { name: 'Député·e', isCurrent: true, familySlug: 'elu-e-national-e' },
      { name: 'Économiste', isCurrent: false, familySlug: 'chercheur-se' },
    ])
  })

  it('names the organisations she belongs to today, by acronym when there is one', () => {
    expect(figureSpotlight(sandrine, [], today).organisations).toEqual([
      { label: 'EELV', slug: 'les-ecologistes' },
    ])
  })

  it('quotes her latest words, passing over a vote or an act that carries none', () => {
    const spotlight = figureSpotlight(
      sandrine,
      [
        said('2021-11-10', 'Nucléaire', 'Sortie', 'Ce ne sont pas des EPR qui vont nous sauver.'),
        said('2026-10-20', 'École', 'Plan d’urgence'),
        said('2025-08-21', 'Gaza', 'Sanctions', 'Il faut remettre en cause les fondamentaux.'),
      ],
      today,
    )

    expect(spotlight.quote).toEqual({
      text: 'Il faut remettre en cause les fondamentaux.',
      sourceName: 'Source du 2025-08-21',
      statedAt: new Date('2025-08-21'),
    })
  })

  it('has nothing to quote when she never spoke', () => {
    expect(figureSpotlight(sandrine, [said('2026-10-20', 'École', 'Plan')], today).quote).toBeNull()
  })

  it('shows her three latest subjects, each once, with where she stands last', () => {
    const spotlight = figureSpotlight(
      sandrine,
      [
        said('2019-01-01', 'Nucléaire', 'Moratoire'),
        said('2021-11-10', 'Nucléaire', 'Sortie'),
        said('2026-10-20', 'École', 'Plan d’urgence'),
        said('2024-05-29', 'Palestine', 'Reconnaissance'),
        said('2021-09-08', 'Pesticides', 'Interdiction'),
      ],
      today,
    )

    expect(spotlight.latest).toEqual([
      { subjectTitle: 'École', subjectSlug: 'école', positionTitle: 'Plan d’urgence', year: 2026 },
      {
        subjectTitle: 'Palestine',
        subjectSlug: 'palestine',
        positionTitle: 'Reconnaissance',
        year: 2024,
      },
      { subjectTitle: 'Nucléaire', subjectSlug: 'nucléaire', positionTitle: 'Sortie', year: 2021 },
    ])
  })
})
