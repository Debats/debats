import Link from 'next/link'
import { argumentHref, ArgumentSummary } from '../../../domain/read-models/argument'
import { plural } from '../../../lib/plural'
import styles from './ArgumentCard.module.css'

interface ArgumentCardProps {
  argument: ArgumentSummary
}

/** Carte d'un argument dans l'index : titre, description, sur combien de sujets il sert. */
export default function ArgumentCard({ argument }: ArgumentCardProps) {
  return (
    <Link href={argumentHref(argument)} className={styles.card}>
      <span className={styles.title}>{argument.title}</span>
      {argument.description && <span className={styles.description}>{argument.description}</span>}
      <span className={styles.meta}>
        {argument.statementsCount}{' '}
        {plural(argument.statementsCount, 'prise de position', 'prises de position')} ·{' '}
        {argument.subjectsCount} {plural(argument.subjectsCount, 'sujet', 'sujets')}
      </span>
    </Link>
  )
}
