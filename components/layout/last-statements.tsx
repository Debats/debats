import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { loadSignatories } from '../../infra/queries/joint-declarations'
import {
  declarationIdsIn,
  gatherSignatures,
  signatureOfLatest,
  SIGNATURES_WINDOW,
} from '../../domain/read-models/gathered-signatures'
import StatementList from './StatementList'

/** How many entries each of the two lists shows */
const SHOWN = 5

/**
 * Les deux listes du rail commun : les dernières prises de position, et les
 * dernières ajoutées au site. Les signatures d'un même texte y tiennent en
 * une entrée.
 */
export default async function LastStatements() {
  const supabase = createAdminSupabaseClient()
  const statementRepo = createStatementRepository(supabase)
  const [latestTaken, latestReported] = await Promise.all([
    Effect.runPromise(statementRepo.findLatest(SIGNATURES_WINDOW)),
    Effect.runPromise(statementRepo.findLatestReported(SIGNATURES_WINDOW)),
  ])
  const signatories = await Effect.runPromise(
    loadSignatories(
      supabase,
      declarationIdsIn([...latestTaken, ...latestReported], signatureOfLatest),
    ),
  )
  const gathered = (statements: typeof latestTaken) =>
    gatherSignatures(statements, signatureOfLatest, signatories, SHOWN)

  return (
    <>
      <StatementList title="LES DERNIÈRES PRISES DE POSITION" entries={gathered(latestTaken)} />
      <StatementList
        title="LES DERNIÈRES PRISES DE POSITION AJOUTÉES"
        entries={gathered(latestReported)}
      />
    </>
  )
}
