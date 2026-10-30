import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { searchSite } from '../../infra/queries/search-site'
import { groupSearchHits, parseSearchQuery } from '../../domain/read-models/search'
import PageHero from '../../components/layout/PageHero'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import SearchForm from './SearchForm'
import SearchResults from './SearchResults'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

/** Hits of each kind the page shows at most */
const PAGE_HITS_PER_KIND = 20

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = parseSearchQuery((await searchParams).q)
  return {
    title: query ? `Recherche : ${query}` : 'Recherche',
    description: 'Trouver un sujet, une personnalité, une organisation, un argument sur Débats.co.',
    // A results page is nobody's destination from a search engine
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const raw = (await searchParams).q ?? ''
  const query = parseSearchQuery(raw)
  const hits = query
    ? await Effect.runPromise(searchSite(createAdminSupabaseClient(), query, PAGE_HITS_PER_KIND))
    : []

  return (
    <>
      <PageHero
        kicker="Explorer"
        title="Rechercher"
        intro="Un sujet, une position, une personnalité, une organisation, un argument ou une thématique. Les accents et les fautes de frappe sont pardonnés."
      >
        <SearchForm initialQuery={raw} />
      </PageHero>

      <ContentWithSidebar topMargin>
        <SearchResults query={query} groups={groupSearchHits(hits)} />
      </ContentWithSidebar>
    </>
  )
}
