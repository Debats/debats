import { AgentBudget, BUDGET_STEP_CENTS } from '../../../../domain/services/chantier-budget'
import Button from '../../../../components/ui/Button'
import { dollars } from '../../../../lib/dollars'
import BudgetBar from '../BudgetBar'
import { spendLine } from '../spend-line'
import styles from './ChantierBudget.module.css'

interface ChantierBudgetProps {
  budget: AgentBudget
  /** Whether the cap may still be pushed: a chantier that takes no more messages keeps its cap */
  pushable: boolean
  pushing: boolean
  /** Why the last push did not go through, when it did not */
  refusal?: string
  onPush: () => void
}

/**
 * What the agent of a chantier has spent against its cap, and the way to
 * let it spend more. The cap stops the agent, never the person: she pushes
 * it one step further when the chantier is worth it.
 */
export default function ChantierBudget({
  budget,
  pushable,
  pushing,
  refusal,
  onPush,
}: ChantierBudgetProps) {
  return (
    <div className={styles.budget}>
      <p className={styles.line}>
        <span className={styles.label}>Budget de l’agent</span>
        <span className={styles.figures}>{spendLine(budget)}</span>
      </p>
      <BudgetBar spend={budget} />
      {budget.reached && (
        <p className={styles.reached} role="status">
          Budget atteint : l’agent s’est arrêté, et reprendra de lui-même si vous le repoussez.
        </p>
      )}
      {pushable && (
        <div>
          <Button variant="secondary" size="small" onClick={onPush} disabled={pushing}>
            {pushing ? 'Un instant…' : `Repousser de ${dollars(BUDGET_STEP_CENTS)}`}
          </Button>
        </div>
      )}
      {refusal && (
        <p className={styles.refusal} role="alert">
          {refusal}
        </p>
      )}
    </div>
  )
}
