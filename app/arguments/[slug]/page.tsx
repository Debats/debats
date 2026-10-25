import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createArgumentRepository } from '../../../infra/database/argument-repository-supabase'
import { createStatementRepository } from '../../../infra/database/statement-repository-supabase'
import { countArgumentAuthors, groupArgumentUsage } from '../../../domain/services/argument-usage'
import { canPerform } from '../../../domain/reputation/permissions'
import { argumentStream } from '../../../domain/aggregates/argument'
import { currentRevision } from '../../../infra/events/stream-revision'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import ShareButton from '../../../components/ui/ShareButton'
import ArgumentAdminMenu from './ArgumentAdminMenu'
import ArgumentHero from './ArgumentHero'
import ArgumentUsage from './ArgumentUsage'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = createAdminSupabaseClient()
    const argument = await Effect.runPromise(createArgumentRepository(supabase).findBySlug(slug))
    if (!argument) return { title: 'Argument introuvable' }
    const description =
      argument.description ||
      `Qui mobilise l’argument « ${argument.title} », sur quels sujets et pour quelles positions.`
    const url = `/arguments/${slug}`
    return {
      title: `${argument.title} — Argument`,
      description,
      alternates: { canonical: url },
      openGraph: { title: argument.title, description, type: 'article', url },
    }
  } catch {
    return { title: 'Argument' }
  }
}

export default async function ArgumentDetailPage({ params }: PageProps) {
  const { slug } = await params

  const supabase = createAdminSupabaseClient()
  const argument = await Effect.runPromise(createArgumentRepository(supabase).findBySlug(slug))
  if (!argument) notFound()

  const [statements, contributor, revision] = await Promise.all([
    Effect.runPromise(createStatementRepository(supabase).findByArgumentWithAuthors(argument.id)),
    getAuthenticatedContributor(),
    currentRevision(argumentStream(argument.id)),
  ])

  const usage = groupArgumentUsage(statements)
  const canRename = !!contributor && canPerform(contributor.reputation, 'edit_argument')
  const canMerge = !!contributor && canPerform(contributor.reputation, 'delete_argument')

  return (
    <>
      <ArgumentHero
        title={argument.title}
        description={argument.description}
        counts={{
          statements: statements.length,
          subjects: usage.length,
          authors: countArgumentAuthors(statements),
        }}
        adminMenu={
          (canRename || canMerge) && (
            <ArgumentAdminMenu
              argument={{
                id: argument.id,
                title: argument.title,
                description: argument.description,
              }}
              revision={revision}
              canRename={canRename}
              canMerge={canMerge}
            />
          )
        }
        actions={<ShareButton compact title={argument.title} />}
      />

      <ContentWithSidebar topMargin>
        <ArgumentUsage usage={usage} />
      </ContentWithSidebar>
    </>
  )
}
