import {
  ResolvedAffiliation,
  ResolvedArgument,
  ResolvedOccupation,
} from '../../../../domain/use-cases/resolve-draft'
import styles from './DraftEnrichment.module.css'

interface DraftEnrichmentProps {
  arguments: ResolvedArgument[]
  occupations: ResolvedOccupation[]
  affiliations: ResolvedAffiliation[]
}

/** The period of an affiliation, read as « depuis 2007 » or « 2015 – 2022 ». */
function periodOf({ startedOn, endedOn }: ResolvedAffiliation): string | null {
  const year = (date: string) => date.slice(0, 4)
  if (startedOn && endedOn) return `${year(startedOn)} – ${year(endedOn)}`
  if (startedOn) return `depuis ${year(startedOn)}`
  if (endedOn) return `jusqu’en ${year(endedOn)}`
  return null
}

/**
 * What the draft adds beyond the statement itself: the arguments it mobilises,
 * and — for a public figure — her occupations and affiliations. Each one says
 * whether it already exists, so the reviewer sees what validating would create.
 */
export default function DraftEnrichment({
  arguments: mobilised,
  occupations,
  affiliations,
}: DraftEnrichmentProps) {
  if (mobilised.length === 0 && occupations.length === 0 && affiliations.length === 0) {
    return null
  }

  return (
    <div className={styles.enrichment}>
      {mobilised.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.heading}>Arguments mobilisés</h3>
          <ul className={styles.list}>
            {mobilised.map((argument) => (
              <li key={argument.title} className={styles.item}>
                <span className={styles.name}>{argument.title}</span>
                {argument.known ? (
                  <span className={styles.known}>connu</span>
                ) : (
                  <span className={styles.created}>à créer</span>
                )}
                {argument.description && (
                  <span className={styles.detail}>{argument.description}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {occupations.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.heading}>Métiers</h3>
          <ul className={styles.list}>
            {occupations.map((occupation) => (
              <li key={occupation.name} className={styles.item}>
                <span className={styles.name}>
                  {occupation.current ? occupation.name : `ex- ${occupation.name}`}
                </span>
                {!occupation.listed && <span className={styles.missing}>hors liste</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {affiliations.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.heading}>Affiliations</h3>
          <ul className={styles.list}>
            {affiliations.map((affiliation) => {
              const period = periodOf(affiliation)
              return (
                <li key={affiliation.organisation} className={styles.item}>
                  <span className={styles.name}>{affiliation.organisation}</span>
                  {affiliation.found ? (
                    <span className={styles.known}>connue</span>
                  ) : affiliation.canCreate ? (
                    <span className={styles.created}>à créer</span>
                  ) : (
                    <span className={styles.missing}>inconnue, sans données</span>
                  )}
                  {affiliation.role && <span className={styles.detail}>{affiliation.role}</span>}
                  {period && <span className={styles.detail}>{period}</span>}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
