import Link from 'next/link'
import {
  Chantier,
  CHANTIER_STATUS_LABELS,
  ChantierMessage,
} from '../../../../domain/entities/chantier'
import { DraftTally, tallyLine } from '../../../../domain/read-models/chantier-summary'
import { AgentSpend } from '../../../../domain/services/chantier-budget'
import { withoutTitleLine } from '../../../../domain/services/chantier-title'
import BudgetBar from '../BudgetBar'
import { chantierHref } from '../hrefs'
import { spendLine } from '../spend-line'
import styles from './ChantierCard.module.css'

interface ChantierCardProps {
  chantier: Chantier
  tally: DraftTally
  /** What its agent spent against its cap; null when its session could not say, or when it has none */
  spend: AgentSpend | null
  /** The last thing the agent said, for the card's foot */
  lastWord: ChantierMessage | null
}

const LAST_WORD_LENGTH = 180

const shortened = (text: string) =>
  text.length > LAST_WORD_LENGTH ? `${text.slice(0, LAST_WORD_LENGTH).trimEnd()}…` : text

/** One chantier in the list: its name, its brief, what became of its drafts, what its agent spent, the agent's last word */
export default function ChantierCard({ chantier, tally, spend, lastWord }: ChantierCardProps) {
  const title = chantier.title ?? chantier.brief
  return (
    <article className={`${styles.card} ${chantier.status === 'waiting' ? styles.waiting : ''}`}>
      <div className={styles.head}>
        <span className={styles.date}>
          Lancé le{' '}
          {chantier.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
        </span>
        <span className={`${styles.status} ${styles[chantier.status]}`}>
          {CHANTIER_STATUS_LABELS[chantier.status]}
        </span>
      </div>
      <h2 className={styles.title}>
        <Link href={chantierHref(chantier.id)} className={styles.titleLink}>
          {title}
        </Link>
      </h2>
      {chantier.title && <p className={styles.brief}>{chantier.brief}</p>}
      <div className={styles.measure}>
        {tally.total > 0 && (
          <div aria-hidden="true" className={styles.meter}>
            <span className={styles.meterValidated} style={{ flex: tally.validated }} />
            <span className={styles.meterPending} style={{ flex: tally.pending }} />
            <span className={styles.meterSetAside} style={{ flex: tally.setAside }} />
          </div>
        )}
        <span className={styles.measureLine}>{tallyLine(tally)}</span>
      </div>
      {spend && (
        <div className={styles.measure}>
          <BudgetBar spend={spend} />
          <span className={styles.measureLine}>Budget · {spendLine(spend)}</span>
        </div>
      )}
      {lastWord && (
        <p className={styles.lastWord}>
          <span className={styles.lastWordWho}>L’agent</span>
          {shortened(withoutTitleLine(lastWord.text))}
        </p>
      )}
    </article>
  )
}
