import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { loadFigureIndex, loadFigureSpotlight } from '../../infra/queries/figure-index'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { canPerform } from '../../domain/reputation/permissions'
import {
  FIGURE_INDEX_PAGES_PARAM,
  FIGURE_INDEX_VIEW_PARAM,
  RANKED_PAGE_SIZE,
  figureIndexHref,
  figureIndexTotals,
  figuresByDocumentation,
  figuresToDocument,
  groupFiguresByFamily,
  parseFigureIndexView,
  parseRankedPages,
} from '../../domain/read-models/figure-index'
import { FIGURES_HREF } from '../../domain/read-models/hrefs'
import { dailyIndex, dailyPick } from '../../domain/services/daily-pick'
import Button from '../../components/ui/Button'
import PersonalitySearch from '../../components/figures/PersonalitySearch'
import AnchorBar from '../../components/layout/AnchorBar'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import HeroStats from '../../components/layout/HeroStats'
import PageHero from '../../components/layout/PageHero'
import { plural } from '../../lib/plural'
import FigureIndexViewToggle from './FigureIndexViewToggle'
import FigureSection from './FigureSection'
import FiguresToDocument from './FiguresToDocument'
import MostDocumentedFigures from './MostDocumentedFigures'
import ProposeFigure from './ProposeFigure'
import RandomFigure from './RandomFigure'
import { figureSectionAnchor, figureSectionName } from './figure-section'
import styles from './personalities.module.css'

export const metadata: Metadata = {
  title: 'Personnalités',
  description:
    'Les personnalités publiques référencées sur Débats.co, par métier, et leurs prises de position sur les sujets de société.',
}

/** How many figures the rail invites to document */
const TO_DOCUMENT = 4

interface PageProps {
  searchParams: Promise<{
    [FIGURE_INDEX_VIEW_PARAM]?: string
    [FIGURE_INDEX_PAGES_PARAM]?: string
  }>
}

export default async function PersonalitiesPage({ searchParams }: PageProps) {
  const supabase = createAdminSupabaseClient()
  // Un seul jour pour toute la page, comme ailleurs
  const today = new Date()

  const [entries, contributor, params] = await Promise.all([
    Effect.runPromise(loadFigureIndex(supabase)),
    getAuthenticatedContributor(),
    searchParams,
  ])
  const view = parseFigureIndexView(params[FIGURE_INDEX_VIEW_PARAM])
  const canAddFigure = !!contributor && canPerform(contributor.reputation, 'add_personality')

  const heard = entries.filter((entry) => entry.statementsCount > 0)
  const picked = dailyPick(heard, (entry) => entry.slug, today)
  const spotlight = picked
    ? await Effect.runPromise(loadFigureSpotlight(supabase, picked.slug, today))
    : null

  const totals = figureIndexTotals(entries)
  const sections = view === 'families' ? groupFiguresByFamily(entries, today) : []
  const ranked = view === 'ranking' ? figuresByDocumentation(entries, today) : []
  const pages = parseRankedPages(params[FIGURE_INDEX_PAGES_PARAM])
  const shown = ranked.slice(0, pages * RANKED_PAGE_SIZE)

  return (
    <>
      <PageHero
        kicker="Explorer"
        title="Les personnalités"
        intro="Élu·es, responsables, chercheur·ses, artistes : qui a pris position, sur quoi, et sur quelles bases."
        aside={
          <HeroStats
            stats={[
              {
                value: totals.figures,
                label: plural(totals.figures, 'personnalité', 'personnalités'),
              },
              {
                value: totals.statements,
                label: plural(totals.statements, 'prise de position', 'prises de position'),
              },
              {
                value: totals.families,
                label: plural(totals.families, 'famille de métiers', 'familles de métiers'),
              },
            ]}
          />
        }
        actions={
          canAddFigure && <Button href={`${FIGURES_HREF}/ajouter`}>Ajouter une personnalité</Button>
        }
      >
        <PersonalitySearch />
      </PageHero>

      {sections.length > 0 && (
        <AnchorBar
          ariaLabel="Familles de métiers"
          items={sections.map((section) => ({
            anchor: figureSectionAnchor(section),
            label: figureSectionName(section),
            count: section.total,
          }))}
        />
      )}

      <ContentWithSidebar
        topMargin
        hideLatestStatements
        aside={
          <>
            {spotlight && (
              <RandomFigure initial={spotlight} slugs={heard.map((entry) => entry.slug)} />
            )}
            <FiguresToDocument
              figures={figuresToDocument(entries, dailyIndex(entries.length, today), TO_DOCUMENT)}
            />
            <ProposeFigure canAddFigure={canAddFigure} />
          </>
        }
      >
        {entries.length === 0 ? (
          <p className={styles.empty}>Aucune personnalité pour le moment.</p>
        ) : (
          <>
            <div className={styles.toolbar}>
              <FigureIndexViewToggle active={view} />
              <p className={styles.rule}>
                {view === 'families'
                  ? 'En fonction d’abord, puis par nombre de sujets · chaque visage une seule fois'
                  : 'Par nombre de sujets, puis de prises de position'}
              </p>
            </div>
            {view === 'ranking' ? (
              <MostDocumentedFigures
                figures={shown}
                total={ranked.length}
                moreHref={
                  shown.length < ranked.length ? figureIndexHref('ranking', pages + 1) : undefined
                }
              />
            ) : (
              <div className={styles.sections}>
                {sections.map((section) => (
                  <FigureSection key={figureSectionAnchor(section)} section={section} />
                ))}
              </div>
            )}
          </>
        )}
      </ContentWithSidebar>
    </>
  )
}
