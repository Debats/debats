import { describe, expect, it } from 'vitest'
import { makeDraft } from '../use-cases/draft-test-helpers'
import { reviewNotice } from './review-notice'

describe('reviewNotice', () => {
  it('says nothing of a draft still waiting', () => {
    expect(reviewNotice(makeDraft())).toBeNull()
  })

  it('tells a validation with the statement and what it created', () => {
    const notice = reviewNotice(
      makeDraft({
        status: 'validated',
        validation: { statementId: 'stmt-9', created: ['subject', 'public_figure'] },
      }),
    )
    expect(notice).toBe(
      "Relecture : brouillon draft-1 (Jean-Luc Mélenchon sur « L'immigration », position « Régularisation des sans-papiers ») validé. Prise de position en ligne sous l'identifiant stmt-9 ; la validation a créé le sujet et la personnalité.",
    )
  })

  it('tells a validation that reused everything', () => {
    const notice = reviewNotice(
      makeDraft({ status: 'validated', validation: { statementId: 'stmt-9', created: [] } }),
    )
    expect(notice).toContain('la validation n’a rien eu à créer.')
  })

  it('tells a rejection with its reason', () => {
    const notice = reviewNotice(makeDraft({ status: 'rejected', rejectionNote: 'Paraphrase.' }))
    expect(notice).toContain('rejeté. Motif : Paraphrase.')
  })

  it('tells a revision request and how to answer it', () => {
    const notice = reviewNotice(
      makeDraft({ status: 'revision_requested', rejectionNote: 'Date fausse.' }),
    )
    expect(notice).toContain('renvoyé en révision. Demande : Date fausse.')
    expect(notice).toContain('PATCH /api/drafts/draft-1')
  })
})
