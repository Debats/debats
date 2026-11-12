import { Fragment } from 'react'
import Link from 'next/link'
import AuthorAvatar from '../../components/statements/AuthorAvatar'
import { FigureAgreement } from '../../domain/read-models/figure-agreements'
import { figureHref, subjectHref } from '../../domain/read-models/hrefs'
import { publicFigureRef } from '../../domain/read-models/statement-author'
import { plural } from '../../lib/plural'
import styles from './FigurePairs.module.css'

/**
 * Une paire : les deux visages, les deux noms, sur combien de sujets elles
 * s'accordent parmi ceux qu'elles ont en commun, et quelques-uns de ces sujets.
 */
export default function FigurePairCard({ pair }: { pair: FigureAgreement }) {
  const { a, b, agreedSubjects, commonSubjects, examples } = pair

  return (
    <li className={styles.card}>
      <div className={styles.faces}>
        <AuthorAvatar author={publicFigureRef(a)} size={56} />
        <span className={styles.second}>
          <AuthorAvatar author={publicFigureRef(b)} size={56} />
        </span>
      </div>
      <p className={styles.names}>
        <Link href={figureHref(a.slug)} className={styles.name}>
          {a.name}
        </Link>{' '}
        et{' '}
        <Link href={figureHref(b.slug)} className={styles.name}>
          {b.name}
        </Link>
      </p>
      <p className={styles.count}>
        <span className={styles.number}>{agreedSubjects}</span>
        <span className={styles.unit}>
          {plural(agreedSubjects, 'sujet en accord', 'sujets en accord')}
          <br />
          sur {commonSubjects} en commun
        </span>
      </p>
      <div
        className={styles.meter}
        role="img"
        aria-label={`D’accord sur ${agreedSubjects} des ${commonSubjects} sujets en commun`}
      >
        <span
          className={styles.meterFill}
          style={{ width: `${(agreedSubjects / commonSubjects) * 100}%` }}
        />
      </div>
      {examples.length > 0 && (
        <p className={styles.examples}>
          Entre autres :{' '}
          {examples.map((subject, index) => (
            <Fragment key={subject.slug}>
              {index > 0 && ', '}
              <Link href={subjectHref(subject.slug)} className={styles.example}>
                {subject.title}
              </Link>
            </Fragment>
          ))}
        </p>
      )}
    </li>
  )
}
