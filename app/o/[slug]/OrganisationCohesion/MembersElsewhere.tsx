import Link from 'next/link'
import { figureHref } from '../../../../domain/read-models/hrefs'
import { MemberElsewhere } from '../../../../domain/services/author-analyses'
import styles from './OrganisationCohesion.module.css'

interface MembersElsewhereProps {
  /** Ce qui les réunit : « Position compatible », « Autre position » */
  label: string
  members: MemberElsewhere[]
}

/**
 * Les membres qui ne tiennent pas la position de l'organisation sur un sujet,
 * chacun·e avec la position qu'il ou elle tient à la place.
 */
export default function MembersElsewhere({ label, members }: MembersElsewhereProps) {
  if (members.length === 0) return null

  return (
    <p className={styles.line}>
      <span className={styles.lineLabel}>{label}</span>{' '}
      {members.map(({ figure, positions }, index) => (
        <span key={figure.id}>
          {index > 0 && ', '}
          <Link href={figureHref(figure.slug)} className={styles.member}>
            {figure.name}
          </Link>{' '}
          <span className={styles.meta}>({positions.map((p) => p.title).join(', ')})</span>
        </span>
      ))}
    </p>
  )
}
