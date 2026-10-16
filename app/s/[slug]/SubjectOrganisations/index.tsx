import Link from 'next/link'
import OrganisationLogo from '../../../../components/organisations/OrganisationLogo'
import { StatementAuthorRef } from '../../../../domain/read-models/statement-author'
import { PositionSummary } from '../../../../domain/read-models/subject-positions-summary'
import styles from './SubjectOrganisations.module.css'

interface SubjectOrganisationsProps {
  positions: PositionSummary[]
}

interface EngagedOrganisation {
  organisation: StatementAuthorRef
  positionTitles: string[]
}

/** Chaque organisation du sujet avec la ou les positions qu'elle défend, dans l'ordre des positions. */
function engagedOrganisations(positions: PositionSummary[]): EngagedOrganisation[] {
  const byId = new Map<string, EngagedOrganisation>()
  for (const position of positions) {
    for (const organisation of position.organisations) {
      const entry = byId.get(organisation.id) ?? { organisation, positionTitles: [] }
      entry.positionTitles.push(position.positionTitle)
      byId.set(organisation.id, entry)
    }
  }
  return Array.from(byId.values())
}

/** Encart du rail : partis, ONG, syndicats, entreprises et collectifs qui ont pris position. */
export default function SubjectOrganisations({ positions }: SubjectOrganisationsProps) {
  const organisations = engagedOrganisations(positions)

  return (
    <section className={styles.card}>
      <p className={styles.title}>Organisations engagées</p>
      {organisations.length === 0 ? (
        <p className={styles.empty}>
          Aucune organisation n&apos;a encore pris position sur ce sujet.
        </p>
      ) : (
        <ul className={styles.list}>
          {organisations.map(({ organisation, positionTitles }) => (
            <li key={organisation.id} className={styles.row}>
              <OrganisationLogo
                slug={organisation.slug}
                name={organisation.name}
                acronym={organisation.acronym}
                size={32}
              />
              <div className={styles.body}>
                <Link href={`/o/${organisation.slug}`} className={styles.name}>
                  {organisation.name}
                </Link>
                <span className={styles.positions}>{positionTitles.join(' · ')}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
