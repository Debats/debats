import { Metadata } from 'next'
import SubjectDetail from '../SubjectDetail'
import { subjectMetadata } from '../subject-metadata'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return subjectMetadata(slug, 'arguments')
}

export default async function SubjectArgumentsPage({ params }: PageProps) {
  const { slug } = await params
  return <SubjectDetail slug={slug} activeTab="arguments" />
}
