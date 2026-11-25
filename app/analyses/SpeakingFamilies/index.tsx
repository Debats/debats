import RuledSection from '../../../components/layout/RuledSection'
import { OCCUPATIONS_HREF, occupationFamilyHref } from '../../../domain/read-models/hrefs'
import { FamilySpeakers } from '../../../domain/services/site-analyses'
import { plural } from '../../../lib/plural'
import AnalysisCard from '../components/AnalysisCard'
import BarList from '../components/BarList'

const counted = (count: number) => count.toLocaleString('fr-FR')

/**
 * Qui prend la parole : les voix des personnalités, par famille de métiers.
 * Une personnalité exprimée sur trois sujets y pèse trois voix.
 */
export default function SpeakingFamilies({ speakers }: { speakers: FamilySpeakers[] }) {
  if (speakers.length === 0) return null
  const most = speakers[0].voices

  return (
    <RuledSection
      nested
      title="Qui prend la parole"
      intro="Les voix des personnalités, par famille de métiers."
      more={{ href: OCCUPATIONS_HREF, label: 'Tous les métiers' }}
      moreInHead
    >
      <AnalysisCard>
        <BarList
          items={speakers.map(({ family, voices, figures }) => ({
            key: family.id,
            label: family.name,
            href: occupationFamilyHref(family),
            part: voices / most,
            value: `${counted(voices)} voix · ${counted(figures)} ${plural(figures, 'personnalité', 'personnalités')}`,
          }))}
        />
      </AnalysisCard>
    </RuledSection>
  )
}
