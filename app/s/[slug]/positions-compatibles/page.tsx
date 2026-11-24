import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../../infra/database/subject-repository-supabase'
import { createPositionRepository } from '../../../../infra/database/position-repository-supabase'
import { createStatementRepository } from '../../../../infra/database/statement-repository-supabase'
import { findJudgedPairs } from '../../../../infra/queries/position-judgements'
import { canPerform } from '../../../../domain/reputation/permissions'
import { subjectHref } from '../../../../domain/read-models/hrefs'
import { compatibilityBoard } from '../../../../domain/read-models/position-judgements'
import { authorKey } from '../../../../domain/services/author-on-subject'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import FormPageHeader from '../../../../components/layout/FormPageHeader'
import PositionsNav from './PositionsNav'
import PositionVerdicts from './PositionVerdicts'
import styles from './positions-compatibles.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ position?: string | string[] }>
}

export const metadata: Metadata = {
  title: 'Positions compatibles',
  description: 'Dire quelles positions d’un sujet se défendent ensemble sur Débats.co.',
  robots: { index: false },
}

/**
 * Where the positions of a subject are judged two by two: one position
 * (`?position=`) faced with every other, compatible or not.
 */
export default async function CompatiblePositionsPage({ params, searchParams }: PageProps) {
  const [{ slug }, { position }] = await Promise.all([params, searchParams])

  const contributor = await getAuthenticatedContributor()
  if (!contributor || !canPerform(contributor.reputation, 'judge_positions')) {
    redirect(subjectHref(slug))
  }

  const supabase = createAdminSupabaseClient()
  const subject = await Effect.runPromise(createSubjectRepository(supabase).findBySlug(slug))
  if (!subject) notFound()

  const [positions, statements, judged] = await Promise.all([
    Effect.runPromise(createPositionRepository(supabase).findBySubjectId(subject.id)),
    Effect.runPromise(createStatementRepository(supabase).findBySubjectWithAuthors(subject.id)),
    Effect.runPromise(findJudgedPairs(supabase, [subject.id])),
  ])

  const board = compatibilityBoard(
    subject.slug,
    positions.map(({ id, title, slug: positionSlug }) => ({ id, title, slug: positionSlug })),
    judged,
    statements.map(({ author, position: taken }) => ({
      author: { key: authorKey(author), name: author.name },
      positionId: taken.id,
    })),
    typeof position === 'string' ? position : undefined,
  )

  return (
    <div className={styles.page}>
      <FormPageHeader
        backHref={subjectHref(subject.slug)}
        backLabel="Retour au sujet"
        title="Positions compatibles"
        subtitle={subject.title}
      />
      {board.selected && board.rows.length > 0 ? (
        <div className={styles.board}>
          <PositionsNav positions={board.positions} />
          <PositionVerdicts
            // A position chosen in the list is another set of rows: their state starts anew
            key={board.selected.id}
            subject={{ id: subject.id, slug: subject.slug }}
            selected={board.selected}
            rows={board.rows}
          />
        </div>
      ) : (
        <p className={styles.empty}>Ce sujet n’a pas encore deux positions à comparer.</p>
      )}
    </div>
  )
}
