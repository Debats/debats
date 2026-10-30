import CompanyCard from './CompanyCard'
import ExpressionProfileCard from './ExpressionProfileCard'
import PositionChangesCard from './PositionChangesCard'
import StandingCard from './StandingCard'
import { StatementAuthorRef } from '../../../domain/read-models/statement-author'
import { AuthorAnalysis } from '../../../domain/services/author-analyses'
import { plural } from '../../../lib/plural'
import styles from './AuthorAnalyses.module.css'

interface AuthorAnalysesProps {
  /** The author the analyses are about: her subject pages are linked */
  author: StatementAuthorRef
  /** « cette personnalité », « cette organisation » */
  who: string
  analysis: AuthorAnalysis
  /** A block of the page's own, shown after who she stands with */
  children?: React.ReactNode
}

/** Onglet Analyses d'une personnalité ou d'une organisation : ses positions face aux autres. */
export default function AuthorAnalyses({ author, who, analysis, children }: AuthorAnalysesProps) {
  const { company, standing, changes, profile } = analysis
  // The standing lists every subject she spoke on: none means no statement at all
  if (standing.subjects.length === 0) {
    return (
      <p className={styles.none}>
        Les analyses apparaîtront avec les premières prises de position de {who}.
      </p>
    )
  }

  const subjects = standing.subjects.length
  return (
    <div className={styles.analyses}>
      <CompanyCard company={company} who={who} />
      {children}
      <StandingCard standing={standing} author={author} who={who} />
      <PositionChangesCard changes={changes} author={author} who={who} />
      <ExpressionProfileCard profile={profile} who={who} />
      <p className={styles.note}>
        Sur un sujet, deux auteur·es sont du même avis quand ils ou elles partagent au moins une
        position ; {subjects} {plural(subjects, 'sujet est pris', 'sujets sont pris')} en compte.
      </p>
    </div>
  )
}
