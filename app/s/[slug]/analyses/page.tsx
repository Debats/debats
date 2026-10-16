import { Metadata } from 'next'
import SubjectDetail from '../SubjectDetail'
import { subjectMetadata } from '../subject-metadata'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return subjectMetadata(slug, 'analyses')
}

export default async function SubjectAnalysesPage({ params }: PageProps) {
  const { slug } = await params
  return <SubjectDetail slug={slug} activeTab="analyses" />
}
