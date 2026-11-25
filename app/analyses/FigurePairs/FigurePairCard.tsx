import { Fragment } from 'react'
import Link from 'next/link'
import AuthorAvatar from '../../../components/statements/AuthorAvatar'
import { figureHref, subjectHref } from '../../../domain/read-models/hrefs'
import { publicFigureRef } from '../../../domain/read-models/statement-author'
import { plural } from '../../../lib/plural'
import styles from './FigurePairs.module.css'

interface PairedFigure {
  id: string
  name: string
  slug: string
}

interface FigurePairCardProps {
  a: PairedFigure
  b: PairedFigure
  /** Les sujets que la carte compte : ceux où elles s'accordent, ou ceux où elles s'opposent */
  count: number
  /** Ce que ce nombre compte, au singulier et au pluriel : « sujet en accord », « sujets en accord » */
  unit: [string, string]
  /** Les sujets où toutes deux se sont exprimées */
  commonSubjects: number
  /** Quelques-uns des sujets comptés */
  examples: Array<{ title: string; slug: string }>
}

/**
 * Une paire : les deux visages, les deux noms, sur combien de sujets elles
 * s'accordent ou s'opposent parmi ceux qu'elles ont en commun, et
 * quelques-uns de ces sujets.
 */
export default function FigurePairCard({
  a,
  b,
  count,
  unit,
  commonSubjects,
  examples,
}: FigurePairCardProps) {
  const counted = plural(count, ...unit)

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
        <span className={styles.number}>{count}</span>
        <span className={styles.unit}>
          {counted}
          <br />
          sur {commonSubjects} en commun
        </span>
      </p>
      <div
        className={styles.meter}
        role="img"
        aria-label={`${count} ${counted} sur ${commonSubjects} en commun`}
      >
        <span
          className={styles.meterFill}
          style={{ width: `${(count / commonSubjects) * 100}%` }}
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
