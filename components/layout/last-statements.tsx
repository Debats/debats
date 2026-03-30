import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import StatementList from './StatementList'

export default async function LastStatements() {
  const supabase = createAdminSupabaseClient()
  const statementRepo = createStatementRepository(supabase)
  const [latestTaken, latestReported] = await Promise.all([
    Effect.runPromise(statementRepo.findLatest(5)),
    Effect.runPromise(statementRepo.findLatestReported(5)),
  ])

  return (
    <>
      <StatementList title="LES DERNIÈRES PRISES DE POSITION" statements={latestTaken} />
      <StatementList
        title="LES DERNIÈRES PRISES DE POSITION AJOUTÉES"
        statements={latestReported}
      />
    </>
  )
}
