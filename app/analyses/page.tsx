import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { loadAnalysesPage } from '../../infra/queries/analyses-page'
import AnchorBar from '../../components/layout/AnchorBar'
import PageHero from '../../components/layout/PageHero'
import Chapter from './Chapter'
import DebateLeanings from './DebateLeanings'
import FigurePairs from './FigurePairs'
import MembersCohesion from './MembersCohesion'
import MobilisedArguments from './MobilisedArguments'
import MovingDebates from './MovingDebates'
import PositionChanges from './PositionChanges'
import SiteExpression from './SiteExpression'
import SiteFigures from './SiteFigures'
import SpeakingFamilies from './SpeakingFamilies'
import Standings from './Standings'
import styles from './analyses.module.css'

export const metadata: Metadata = {
  title: 'Analyses',
  description:
    'Ce que Débats.co compare d’un sujet, d’une personnalité ou d’une organisation à l’autre : les sujets partagés et les sujets tranchés, qui pense comme qui, qui a changé de position, les organisations et leurs membres.',
}

const CHAPTERS = [
  { anchor: 'debats', label: 'Les débats' },
  { anchor: 'personnalites', label: 'Les personnalités' },
  { anchor: 'organisations', label: 'Les organisations' },
  { anchor: 'site', label: 'Le site' },
] as const

export default async function AnalysesPage() {
  // The page names the instant it renders at: what counts as recent follows
  const analyses = await Effect.runPromise(
    loadAnalysesPage(createAdminSupabaseClient(), new Date()),
  )
  const [debates, figures, organisations, site] = CHAPTERS

  return (
    <>
      <PageHero
        kicker="Explorer"
        title="Analyses"
        intro="Le site compte les voix qu’il a recensées : ce n’est pas l’opinion du pays."
      />
      <AnchorBar ariaLabel="Chapitres" items={[...CHAPTERS]} />

      <div className={styles.chapters}>
        <Chapter id={debates.anchor} title={debates.label}>
          <DebateLeanings leanings={analyses.leanings} />
          <MovingDebates moving={analyses.moving} />
          <SpeakingFamilies speakers={analyses.speakers} />
          <MobilisedArguments top={analyses.arguments.top} total={analyses.arguments.total} />
        </Chapter>

        <Chapter id={figures.anchor} title={figures.label}>
          <FigurePairs agreeing={analyses.agreeing} opposed={analyses.opposed} />
          <Standings standings={analyses.standings} />
          <PositionChanges changes={analyses.changes} />
        </Chapter>

        <Chapter id={organisations.anchor} title={organisations.label}>
          <MembersCohesion cohesion={analyses.cohesion} />
        </Chapter>

        <Chapter id={site.anchor} title={site.label}>
          <SiteExpression expression={analyses.expression} />
          <SiteFigures figures={analyses.figures} />
        </Chapter>
      </div>
    </>
  )
}
