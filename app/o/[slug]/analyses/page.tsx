import { Metadata } from 'next'
import OrganisationDetail from '../OrganisationDetail'
import { organisationMetadata } from '../organisation-metadata'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return organisationMetadata(slug, 'analyses')
}

export default async function OrganisationAnalysesPage({ params }: PageProps) {
  const { slug } = await params
  return <OrganisationDetail slug={slug} activeTab="analyses" viewParams={{}} />
}
