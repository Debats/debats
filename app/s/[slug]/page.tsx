import { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import SubjectDetail from './SubjectDetail'
import { parseLegacyTabParam, subjectTabHref } from './SubjectTabs'
import { subjectMetadata } from './subject-metadata'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ qui?: string; onglet?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return subjectMetadata(slug, 'positions')
}

export default async function SubjectPage({ params, searchParams }: PageProps) {
  const [{ slug }, { qui, onglet }] = await Promise.all([params, searchParams])

  // The tabs used to be a query parameter; links already shared keep working
  const legacyTab = parseLegacyTabParam(onglet)
  if (legacyTab) permanentRedirect(subjectTabHref(slug, legacyTab))

  return <SubjectDetail slug={slug} activeTab="positions" authorKindParam={qui} />
}
