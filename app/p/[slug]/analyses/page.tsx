import { Metadata } from 'next'
import FigureDetail from '../FigureDetail'
import { figureMetadata } from '../figure-metadata'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return figureMetadata(slug, 'analyses')
}

export default async function PersonalityAnalysesPage({ params }: PageProps) {
  const { slug } = await params
  return <FigureDetail slug={slug} activeTab="analyses" viewParams={{}} />
}
