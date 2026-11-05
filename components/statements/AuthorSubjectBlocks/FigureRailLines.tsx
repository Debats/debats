import Link from 'next/link'
import { Affiliation } from '../../../domain/read-models/author-subject-page'
import styles from './AuthorSubjectBlocks.module.css'

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
      {occupations.length > 0 && <p className={styles.authorRole}>{occupations.join(' · ')}</p>}

      {organisations.length > 0 && (
        <p className={styles.authorRole}>
          Affiliations :{' '}
          {organisations.map((organisation, index) => (
            <span key={organisation.slug}>
              {index > 0 && ', '}
              <Link href={`/o/${organisation.slug}`} className={styles.authorOrganisation}>
                {organisation.acronym ?? organisation.name}
              </Link>
            </span>
          ))}
        </p>
      )}
    </>
  )
}
