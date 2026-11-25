import Link from 'next/link'
import { figureHref, organisationOnSubjectHref } from '../../../../domain/read-models/hrefs'
import { SubjectCohesion } from '../../../../domain/services/author-analyses'
import { plural } from '../../../../lib/plural'
import MembersElsewhere from './MembersElsewhere'
import styles from './OrganisationCohesion.module.css'

interface OrganisationCohesionProps {
  organisationSlug: string
  cohesion: SubjectCohesion[]
  /** The organisation has members at all; without any, the block says so */
  membersCount: number
}

const names = (figures: Array<{ id: string; name: string; slug: string }>) =>
  figures.map((figure, index) => (
    <span key={figure.id}>
      {index > 0 && ', '}
      <Link href={figureHref(figure.slug)} className={styles.member}>
        {figure.name}
      </Link>
    </span>
  ))

/** Sur chaque sujet où l'organisation s'exprime, où se situent ses membres actuels. */
export default function OrganisationCohesion({
  organisationSlug,
  cohesion,
  membersCount,
}: OrganisationCohesionProps) {
  const aligned = cohesion.reduce((sum, c) => sum + c.aligned.length, 0)
  const beside = cohesion.reduce((sum, c) => sum + c.beside.length, 0)
  const apart = cohesion.reduce((sum, c) => sum + c.apart.length, 0)
  const spoken = cohesion.filter((c) => c.aligned.length + c.beside.length + c.apart.length > 0)

  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Ses membres suivent-ils la ligne ?</h3>
      <p className={styles.subtitle}>
        Sur chaque sujet où l’organisation s’est exprimée, ses membres actuels qui tiennent la même
        position, une position compatible, une autre, ou qui ne se sont pas exprimés.
      </p>
      {membersCount === 0 ? (
        <p className={styles.empty}>Aucune personnalité n’est affiliée à cette organisation.</p>
      ) : spoken.length === 0 ? (
        <p className={styles.empty}>
          Aucun de ses {membersCount} {plural(membersCount, 'membre', 'membres')} ne s’est exprimé
          sur ses sujets.
        </p>
      ) : (
        <>
          <p className={styles.headline}>
            <span className={styles.number}>{aligned}</span>
            <span className={styles.headlineText}>
              fois la même position que l’organisation,{' '}
              {beside > 0 && `${beside} fois une position compatible, `}
              {apart} fois une autre, sur {spoken.length} {plural(spoken.length, 'sujet', 'sujets')}
            </span>
          </p>
          <ul className={styles.rows}>
            {spoken.map((c) => (
              <li key={c.subject.id} className={styles.row}>
                <Link
                  href={organisationOnSubjectHref(organisationSlug, c.subject.slug)}
                  className={styles.subject}
                >
                  {c.subject.title}
                </Link>
                <span className={styles.meta}>{c.positions.map((p) => p.title).join(', ')}</span>
                {c.aligned.length > 0 && (
                  <p className={styles.line}>
                    <span className={styles.lineLabel}>Même position</span> {names(c.aligned)}
                  </p>
                )}
                <MembersElsewhere label="Position compatible" members={c.beside} />
                <MembersElsewhere label="Autre position" members={c.apart} />
                {c.silent > 0 && (
                  <p className={styles.silent}>
                    {c.silent} {plural(c.silent, 'membre', 'membres')} sans prise de position
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
