import { Metadata } from 'next'
import {
  authorHref,
  authorOnSubjectHref,
  StatementAuthorRef,
} from '../domain/read-models/statement-author'

interface SubjectSummary {
  title: string
  slug: string
}

/** Metadata of the page « un auteur sur un sujet » */
export function authorOnSubjectMetadata(
  author: StatementAuthorRef,
  subject: SubjectSummary,
): Metadata {
  const title = `${author.name} sur ${subject.title}`
  const description = `Prises de position de ${author.name} sur ${subject.title}.`
  const url = authorOnSubjectHref(author, subject.slug)
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: 'profile', url },
    twitter: { card: 'summary_large_image', title, description },
  }
}

/** Structured data of the page « un auteur sur un sujet » */
export function authorOnSubjectJsonLd(author: StatementAuthorRef, subject: SubjectSummary) {
  const isOrganisation = author.kind === 'organisation'
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${author.name} sur ${subject.title}`,
    description: `Prises de position de ${author.name} sur ${subject.title}.`,
    url: `https://debats.co${authorOnSubjectHref(author, subject.slug)}`,
    image: isOrganisation
      ? `https://debats.co/logos/${author.slug}.png`
      : `https://debats.co/avatars/${author.slug}.jpg`,
    author: { '@type': 'Organization', name: 'Débats.co', url: 'https://debats.co' },
    about: { '@type': 'Thing', name: subject.title },
    mentions: {
      '@type': isOrganisation ? 'Organization' : 'Person',
      name: author.name,
      url: `https://debats.co${authorHref(author)}`,
    },
  }
}
