import Link from 'next/link'
import { Affiliation } from '../../../domain/read-models/author-subject-page'
import { organisationHref } from '../../../domain/read-models/hrefs'
import styles from './AuthorRailCard.module.css'

/** Ce qui présente une personnalité dans le rail : ses métiers, ses affiliations */
export default function FigureRailLines({
  occupations,
  organisations,
}: {
  occupations: string[]
  organisations: Affiliation[]
}) {
  return (
    <>
      {occupations.length > 0 && <p className={styles.line}>{occupations.join(' · ')}</p>}

      {organisations.length > 0 && (
        <p className={styles.line}>
          Affiliations :{' '}
          {organisations.map((organisation, index) => (
            <span key={organisation.slug}>
              {index > 0 && ', '}
              <Link href={organisationHref(organisation.slug)} className={styles.organisation}>
                {organisation.acronym ?? organisation.name}
              </Link>
            </span>
          ))}
        </p>
      )}
    </>
  )
}
