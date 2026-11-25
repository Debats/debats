import RuledSection from '../../../components/layout/RuledSection'
import AuthorAvatar from '../../../components/statements/AuthorAvatar'
import { organisationHref } from '../../../domain/read-models/hrefs'
import { MembersCohesion as Cohesion } from '../../../domain/services/site-analyses'
import { plural } from '../../../lib/plural'
import AnalysisCard from '../components/AnalysisCard'
import BarList from '../components/BarList'

/**
 * Les membres suivent-ils la ligne ? Pour chaque organisation, combien de fois
 * ses membres actuels ont pris sa position sur ses sujets, combien de fois
 * une autre. La ligne mène au détail, sujet par sujet, sur sa page.
 */
export default function MembersCohesion({ cohesion }: { cohesion: Cohesion[] }) {
  if (cohesion.length === 0) return null

  return (
    <RuledSection
      nested
      title="Les membres suivent-ils la ligne ?"
      intro="Sur les sujets où une organisation s’est exprimée, où se situent ses membres actuels."
    >
      <AnalysisCard>
        <BarList
          tone="org"
          items={cohesion.map(({ organisation, aligned, beside, apart, subjects }) => ({
            key: organisation.id,
            lead: <AuthorAvatar author={organisation} size={40} />,
            label: organisation.name,
            href: `${organisationHref(organisation.slug)}/analyses`,
            part: aligned / (aligned + beside + apart),
            value: `${aligned} fois la même position, ${beside > 0 ? `${beside} fois une position compatible, ` : ''}${apart} fois une autre · ${subjects} ${plural(subjects, 'sujet', 'sujets')}`,
          }))}
        />
      </AnalysisCard>
    </RuledSection>
  )
}
