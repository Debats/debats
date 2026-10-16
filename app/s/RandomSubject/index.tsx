'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '../../../components/ui/Button'
import { subjectCountsLabel } from '../../../lib/subject-counts'
import styles from './RandomSubject.module.css'

export interface RandomSubjectCandidate {
  id: string
  title: string
  slug: string
  problem: string
  statementsCount: number
  publicFiguresCount: number
}

interface RandomSubjectProps {
  candidates: RandomSubjectCandidate[]
  /** Le sujet affiché au chargement, choisi côté serveur pour que l'hydratation soit stable */
  initialIndex: number
}

/** Un autre index que l'actuel, au hasard ; le même s'il n'y a pas le choix */
function anotherIndex(current: number, count: number): number {
  if (count < 2) return current
  const offset = 1 + Math.floor(Math.random() * (count - 1))
  return (current + offset) % count
}

/** Encart du rail : un sujet au hasard, à relancer d'un clic. */
export default function RandomSubject({ candidates, initialIndex }: RandomSubjectProps) {
  const [index, setIndex] = useState(initialIndex)
  const subject = candidates[index]

  if (!subject) return null

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Un sujet au hasard</h2>
      <Link href={`/s/${subject.slug}`} className={styles.subject}>
        {subject.title}
      </Link>
      <p className={styles.problem}>{subject.problem}</p>
      <p className={styles.meta}>{subjectCountsLabel(subject)}</p>
      {candidates.length > 1 && (
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={() => setIndex((current) => anotherIndex(current, candidates.length))}
        >
          Un autre
        </Button>
      )}
    </section>
  )
}
