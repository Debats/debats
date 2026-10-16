import Link from 'next/link'
import AuthorAvatarStack from '../../../../components/statements/AuthorAvatarStack'
import Button from '../../../../components/ui/Button'
import {
  argumentHref,
  isPolarisingArgument,
  SubjectArgumentSummary,
} from '../../../../domain/read-models/argument'
import { plural } from '../../../../lib/plural'
import styles from './SubjectArguments.module.css'

interface SubjectArgumentsProps {
  subjectSlug: string
  arguments: SubjectArgumentSummary[]
  /** Où proposer un argument : la saisie d'une prise de position */
  newStatementHref: string
}

/** Onglet Arguments d'un sujet : chaque raisonnement, qui le mobilise, et pour quelles positions. */
export default function SubjectArguments({
  subjectSlug,
  arguments: list,
  newStatementHref,
}: SubjectArgumentsProps) {
  return (
    <section>
      {list.length === 0 ? (
        <p className={styles.empty}>
          Aucun argument n’est encore recensé sur ce sujet. Les arguments se proposent au moment
          d’ajouter une prise de position.
        </p>
      ) : (
        <div className={styles.list}>
          {list.map((argument) => (
            <article key={argument.id} id={`argument-${argument.id}`} className={styles.card}>
              <div className={styles.head}>
                <h3 className={styles.title}>
                  <Link href={argumentHref(argument)} className={styles.titleLink}>
                    {argument.title}
                  </Link>
                </h3>
                <p className={styles.count}>
                  <span className={styles.countValue}>{argument.statementsCount}</span>
                  <span className={styles.countLabel}>
                    {plural(argument.statementsCount, 'prise de position', 'prises de position')}
                  </span>
                </p>
              </div>
              <p className={styles.description}>{argument.description}</p>
              {argument.positions.length > 0 && (
                <>
                  <div className={styles.rule} />
                  <div className={styles.usage}>
                    <ul className={styles.positions} aria-label="Positions qui le mobilisent">
                      {argument.positions.map((position) => (
                        <li key={position.id}>
                          <Link
                            href={`/s/${subjectSlug}/position/${position.slug}`}
                            className={styles.position}
                          >
                            {position.title}
                            <span className={styles.positionCount}>{position.statementsCount}</span>
                          </Link>
                        </li>
                      ))}
                      {isPolarisingArgument(argument) && (
                        <li className={styles.polarising}>Mobilisé par plusieurs positions</li>
                      )}
                    </ul>
                    <AuthorAvatarStack
                      authors={argument.authors}
                      totalCount={argument.totalAuthorsCount}
                      max={6}
                      size={32}
                      subjectSlug={subjectSlug}
                    />
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}

      <div className={styles.cta}>
        <p className={styles.ctaTitle}>Un argument manquant ?</p>
        <p className={styles.ctaText}>
          Les arguments se recensent avec la prise de position qui les mobilise : une citation, sa
          source, et les raisonnements qu’elle avance.
        </p>
        <Button href={newStatementHref}>Ajouter une prise de position</Button>
      </div>
    </section>
  )
}
