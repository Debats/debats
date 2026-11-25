import RuledSection from '../../../components/layout/RuledSection'
import { ArgumentSummary } from '../../../domain/read-models/argument'
import { ARGUMENTS_HREF, argumentHref } from '../../../domain/read-models/hrefs'
import { plural } from '../../../lib/plural'
import AnalysisCard from '../components/AnalysisCard'
import BarList from '../components/BarList'

interface MobilisedArgumentsProps {
  /** Les plus mobilisés d'abord ; seulement ceux à montrer */
  top: ArgumentSummary[]
  /** Combien le site en recense en tout */
  total: number
}

/** Les arguments que les prises de position mobilisent le plus, tous sujets confondus. */
export default function MobilisedArguments({ top, total }: MobilisedArgumentsProps) {
  if (top.length === 0) return null
  const most = top[0].statementsCount

  return (
    <RuledSection
      nested
      title="Les arguments les plus mobilisés"
      count={total}
      more={{ href: ARGUMENTS_HREF, label: 'Tous les arguments' }}
      moreInHead
    >
      <AnalysisCard>
        <BarList
          items={top.map((argument) => ({
            key: argument.id,
            label: argument.title,
            href: argumentHref(argument),
            part: argument.statementsCount / most,
            value: `${argument.statementsCount} fois · ${argument.subjectsCount} ${plural(argument.subjectsCount, 'sujet', 'sujets')}`,
          }))}
        />
      </AnalysisCard>
    </RuledSection>
  )
}
