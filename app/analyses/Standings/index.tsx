import RuledSection from '../../../components/layout/RuledSection'
import AuthorAvatar from '../../../components/statements/AuthorAvatar'
import { figureHref } from '../../../domain/read-models/hrefs'
import { FigureStanding, Standings as SiteStandings } from '../../../domain/services/site-analyses'
import AnalysisCard from '../components/AnalysisCard'
import BarList, { BarListItem } from '../components/BarList'
import CardColumns from '../components/CardColumns'

/** Une ligne par personnalité ; `counted` dit lequel des deux côtés la colonne compte */
const rows = (
  standings: FigureStanding[],
  counted: (standing: FigureStanding) => number,
): BarListItem[] =>
  standings.map((standing) => ({
    key: standing.figure.id,
    lead: <AuthorAvatar author={standing.figure} size={40} />,
    label: standing.figure.name,
    href: `${figureHref(standing.figure.slug)}/analyses`,
    part: counted(standing) / standing.compared,
    value: `${counted(standing)} sujets sur ${standing.compared}`,
  }))

/**
 * Face à l'ensemble : qui se trouve le plus souvent sur la position la plus
 * soutenue d'un sujet, qui se trouve le plus souvent sur une autre. Le site
 * ne dit pas qui a raison : il compte.
 */
export default function Standings({ standings }: { standings: SiteStandings }) {
  const columns = [
    {
      label: 'Le plus souvent sur la position la plus soutenue',
      items: rows(standings.withLeading, (standing) => standing.withLeading),
    },
    {
      label: 'Le plus souvent sur une autre',
      items: rows(standings.elsewhere, (standing) => standing.compared - standing.withLeading),
    },
  ].filter((column) => column.items.length > 0)
  if (columns.length === 0) return null

  return (
    <RuledSection
      nested
      title="Face à l’ensemble"
      intro="Qui se trouve le plus souvent sur la position la plus soutenue d’un sujet, et qui sur une autre. Être ailleurs n’est ni avoir tort ni avoir raison."
    >
      <CardColumns>
        {columns.map((column) => (
          <AnalysisCard key={column.label} label={column.label}>
            <BarList items={column.items} />
          </AnalysisCard>
        ))}
      </CardColumns>
    </RuledSection>
  )
}
