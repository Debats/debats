import { Metadata } from 'next'
import OrganisationDetail from './OrganisationDetail'
import { organisationMetadata } from './organisation-metadata'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tri?: string; theme?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return organisationMetadata(slug, 'statements')
}

export default async function OrganisationDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, viewParams] = await Promise.all([params, searchParams])
  return <OrganisationDetail slug={slug} activeTab="statements" viewParams={viewParams} />
}
