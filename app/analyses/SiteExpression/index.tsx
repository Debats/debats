import RuledSection from '../../../components/layout/RuledSection'
import { StatementType } from '../../../domain/entities/statement'
import { JOINT_DECLARATIONS_HREF } from '../../../domain/read-models/hrefs'
import { SiteExpression as Expression } from '../../../domain/services/site-analyses'
import ActionLink from '../../../components/ui/ActionLink'
import { plural } from '../../../lib/plural'
import AnalysisCard from '../components/AnalysisCard'
import BarList from '../components/BarList'
import CardColumns from '../components/CardColumns'
import styles from './SiteExpression.module.css'

const TYPE_NAMES: Record<StatementType, string> = {
  declaration: 'Déclarations',
  vote: 'Votes',
  program: 'Programmes',
  act: 'Actes',
}

const counted = (count: number) => count.toLocaleString('fr-FR')

/**
 * Comment les positions s'expriment : par quel type de prise de position, en
 * son nom ou en signant avec d'autres, et à travers quelles sources.
 */
export default function SiteExpression({ expression }: { expression: Expression }) {
  const [mostUsed] = expression.byType
  if (!mostUsed) return null
  const [mostCited] = expression.sources

  return (
    <RuledSection nested title="Comment les positions s’expriment">
      <CardColumns>
        <AnalysisCard label="Par type">
          <BarList
            items={expression.byType.map(({ type, count }) => ({
              key: type,
              label: TYPE_NAMES[type],
              part: count / mostUsed.count,
              value: counted(count),
            }))}
          />
          {expression.signed > 0 && (
            <p className={styles.note}>
              {counted(expression.own)}{' '}
              {plural(expression.own, 'prise de position propre', 'prises de position propres')} à
              leur auteur·rice, {counted(expression.signed)}{' '}
              {plural(expression.signed, 'signature', 'signatures')} de{' '}
              <ActionLink href={JOINT_DECLARATIONS_HREF} quiet>
                déclarations communes
              </ActionLink>
              .
            </p>
          )}
        </AnalysisCard>
        {mostCited && (
          <AnalysisCard label="Les sources les plus citées, hors déclarations communes">
            <BarList
              items={expression.sources.map(({ name, count }) => ({
                key: name,
                label: name,
                part: count / mostCited.count,
                value: `${counted(count)} fois`,
              }))}
            />
          </AnalysisCard>
        )}
      </CardColumns>
    </RuledSection>
  )
}
