import Link from 'next/link'
import OrganisationLogo from '../../../../components/organisations/OrganisationLogo'
import { OrganisationLine } from '../../../../domain/services/author-analyses'
import { plural } from '../../../../lib/plural'
import styles from './FigureOrganisationsLine.module.css'

interface FigureOrganisationsLineProps {
  figureSlug: string
  /** One entry per organisation she is a member of that spoke on her subjects */
  line: OrganisationLine[]
}

const titles = (positions: Array<{ title: string }>) => positions.map((p) => p.title).join(', ')

/** Sur les sujets où ses organisations s'expriment aussi, la personnalité suit-elle leur ligne ? */
export default function FigureOrganisationsLine({
  figureSlug,
  line,
}: FigureOrganisationsLineProps) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Et la ligne de ses organisations ?</h3>
      <p className={styles.subtitle}>
        Sur les sujets où une organisation dont elle est membre s’est aussi exprimée, prend-elle la
        même position ?
      </p>
      {line.length === 0 ? (
        <p className={styles.empty}>
          Ses organisations ne se sont pas encore exprimées sur ses sujets.
        </p>
      ) : (
        <ul className={styles.rows}>
          {line.map(({ organisation, aligned, apart }) => (
            <li key={organisation.id} className={styles.row}>
              <OrganisationLogo
                slug={organisation.slug}
                name={organisation.name}
                acronym={organisation.acronym}
                size={32}
              />
              <div className={styles.body}>
                <Link href={`/o/${organisation.slug}`} className={styles.name}>
                  {organisation.acronym ?? organisation.name}
                </Link>
                <span className={styles.meta}>
                  même position sur {aligned.length}{' '}
                  {plural(aligned.length + apart.length, 'sujet', 'sujets')} sur{' '}
                  {aligned.length + apart.length}
                </span>
                {apart.length > 0 && (
                  <ul className={styles.apart}>
                    {apart.map((s) => (
                      <li key={s.subject.id} className={styles.apartRow}>
                        <Link
                          href={`/p/${figureSlug}/s/${s.subject.slug}`}
                          className={styles.subject}
                        >
                          {s.subject.title}
                        </Link>
                        <span className={styles.meta}>
                          elle : {titles(s.mine)} · {organisation.acronym ?? organisation.name} :{' '}
                          {titles(s.theirs)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
