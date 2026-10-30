import { Metadata } from 'next'
import FigureDetail from './FigureDetail'
import { figureMetadata } from './figure-metadata'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tri?: string; theme?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return figureMetadata(slug, 'statements')
}

export default async function PersonalityDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, viewParams] = await Promise.all([params, searchParams])
  return <FigureDetail slug={slug} activeTab="statements" viewParams={viewParams} />
}
