import {
  AgentBudget,
  BUDGET_STEP_CENTS,
  chantierCostCents,
} from '../../../../domain/services/chantier-budget'
import Button from '../../../../components/ui/Button'
import { dollars } from '../../../../lib/dollars'
import BudgetBar from '../BudgetBar'
import { spendLine } from '../spend-line'
import styles from './ChantierBudget.module.css'

interface ChantierBudgetProps {
  budget: AgentBudget
  /** What the sessions before this one had spent, in US cents; zero when the context was never reduced */
  earlierSpentCents: number
  /** Whether the cap may still be pushed: a chantier that takes no more messages keeps its cap */
  pushable: boolean
  pushing: boolean
  /** Why the last push did not go through, when it did not */
  refusal?: string
  onPush: () => void
}

/**
 * What a chantier cost so far, what its agent has spent against the cap of
 * the session it runs in, and the way to let it spend more. The cap stops the agent, never the person: she pushes
 * it one step further when the chantier is worth it.
 */
export default function ChantierBudget({
  budget,
  earlierSpentCents,
  pushable,
  pushing,
  refusal,
  onPush,
}: ChantierBudgetProps) {
  return (
    <div className={styles.budget}>
      <p className={styles.line}>
        <span className={styles.label}>Coût du chantier</span>
        <span className={styles.figures}>
          {dollars(chantierCostCents(budget, earlierSpentCents))}
        </span>
      </p>
      {earlierSpentCents > 0 && (
        <p className={styles.note}>
          Dont {dollars(earlierSpentCents)} avant la dernière réduction du contexte. Au tarif
          public, agent seul.
        </p>
      )}
      <p className={styles.line}>
        <span className={styles.label}>Budget de la session</span>
        <span className={styles.figures}>{spendLine(budget)}</span>
      </p>
      <BudgetBar spend={budget} />
      {budget.reached && (
        <p className={styles.note} role="status">
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
