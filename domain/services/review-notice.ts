import { createdPhrase, DraftStatement } from '../entities/draft-statement'

/**
 * What the site tells the agent of a chantier when a person has reviewed one
 * of its drafts: the decision, enough to find the draft again, and what the
 * decision did or asks. Plain text, as the agent reads it in its session.
 */

/** The draft, named as the agent knows it: who, on what, which side, and its id */
function named(draft: DraftStatement): string {
  return `brouillon ${draft.id} (${draft.author.name} sur « ${draft.subjectTitle} », position « ${draft.positionTitle} »)`
}

/** The notice for a draft just reviewed; nothing for a draft still pending */
export function reviewNotice(draft: DraftStatement): string | null {
  switch (draft.status) {
    case 'validated':
      return `Relecture : ${named(draft)} validé. Prise de position en ligne sous l'identifiant ${draft.validation?.statementId ?? 'inconnu'} ; la validation ${createdPhrase(draft.validation?.created ?? [])}.`
    case 'rejected':
      return `Relecture : ${named(draft)} rejeté. Motif : ${draft.rejectionNote ?? 'non précisé'}. Ne le reposez pas tel quel.`
    case 'revision_requested':
      return `Relecture : ${named(draft)} renvoyé en révision. Demande : ${draft.rejectionNote ?? 'non précisée'}. Corrigez-le par PATCH /api/drafts/${draft.id}, puis dites-le.`
    case 'pending':
      return null
  }
}
