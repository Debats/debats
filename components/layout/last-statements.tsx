import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import StatementList from './StatementList'

/** How many entries each of the two lists shows */
const SHOWN = { limit: 5, offset: 0 }

/**
 * Les deux listes du rail commun : les dernières entrées du flux, par jour
 * déclaré puis par ajout sur le site.
 */
export default async function LastStatements() {
  const statements = createStatementRepository(createAdminSupabaseClient())
  const [taken, added] = await Effect.runPromise(
    Effect.all(
      [statements.findFeed({}, 'stated', SHOWN), statements.findFeed({}, 'added', SHOWN)],
      {
        concurrency: 'unbounded',
      },
    ),
  )

  return (
    <>
      <StatementList title="LES DERNIÈRES PRISES DE POSITION" entries={taken.entries} />
      <StatementList
        title="LES DERNIÈRES PRISES DE POSITION AJOUTÉES"
        entries={added.entries}
        datedBy="added"
      />
    </>
  )
}
