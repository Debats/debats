'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { BoardPosition, BoardRow } from '../../../../../domain/read-models/position-judgements'
import { judgePositionsAction } from '../../../../actions/judge-positions'
import FormError from '../../../../../components/ui/FormError'
import VerdictRow from './VerdictRow'
import styles from './PositionVerdicts.module.css'

interface PositionVerdictsProps {
  subject: { id: string; slug: string }
  /** The position faced with the others */
  selected: BoardPosition
  rows: BoardRow[]
}

/**
 * One position faced with every other of its subject. Each switch saves at
 * once; a verdict the server refuses goes back to what it was.
 */
export default function PositionVerdicts({ subject, selected, rows }: PositionVerdictsProps) {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const [verdicts, setVerdicts] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.map((row) => [row.position.id, row.compatible])),
  )

  const judge = useCallback(
    async (positionId: string, compatible: boolean) => {
      setError(undefined)
      setVerdicts((current) => ({ ...current, [positionId]: compatible }))
      const result = await judgePositionsAction(
        { subjectId: subject.id, positionIds: [selected.id, positionId], compatible },
        subject.slug,
      )
      if (result.success) {
        router.refresh()
      } else {
        setVerdicts((current) => ({ ...current, [positionId]: !compatible }))
        setError(result.error)
      }
    },
    [router, subject, selected.id],
  )

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>« {selected.title} » et…</h2>
      {error && <FormError message={error} />}
      <ul className={styles.rows}>
        {rows.map((row) => (
          <VerdictRow
            key={row.position.id}
            row={row}
            compatible={verdicts[row.position.id] ?? row.compatible}
            onJudge={judge}
          />
        ))}
      </ul>
    </section>
  )
}
