'use client'

import { Progress } from 'radix-ui'
import { AgentSpend, spentShare } from '../../../../domain/services/chantier-budget'
import { spendLine } from '../spend-line'
import styles from './BudgetBar.module.css'

interface BudgetBarProps {
  spend: AgentSpend
}

/** How much of its cap the agent of a chantier has spent, as a bar; who does not see it hears the figures */
export default function BudgetBar({ spend }: BudgetBarProps) {
  const percent = spentShare(spend) * 100
  return (
    <Progress.Root
      className={styles.track}
      value={percent}
      aria-label="Budget de l’agent"
      getValueLabel={() => spendLine(spend)}
    >
      <Progress.Indicator className={styles.fill} style={{ width: `${percent}%` }} />
    </Progress.Root>
  )
}
