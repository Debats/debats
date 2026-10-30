'use client'

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { StatementAuthorKind } from '../../../domain/entities/statement'
import { StatementContentInput } from '../../../domain/use-cases/validate-statement-fields'

/**
 * Ce que l'utilisateur a saisi jusqu'ici, pour l'aperçu en marge du
 * formulaire. Le contenu reste à plat, champ par champ : une saisie en cours
 * ne satisfait pas encore l'union du domaine.
 */
export interface StatementDraft extends StatementContentInput {
  authorKind: StatementAuthorKind
  authorName: string
  subjectTitle: string
  positionTitle: string
  sourceName: string
  statedAt: string
}

export const EMPTY_DRAFT: StatementDraft = {
  authorKind: 'public_figure',
  authorName: '',
  subjectTitle: '',
  positionTitle: '',
  sourceName: '',
  statedAt: '',
  statementType: 'declaration',
  quote: '',
  document: '',
  votedText: '',
  choice: '',
  deed: '',
}

interface StatementDraftContextValue {
  draft: StatementDraft
  updateDraft: (patch: Partial<StatementDraft>) => void
}

const StatementDraftContext = createContext<StatementDraftContextValue | null>(null)

export function StatementDraftProvider({
  initial,
  children,
}: {
  initial?: Partial<StatementDraft>
  children: ReactNode
}) {
  const [draft, setDraft] = useState<StatementDraft>({ ...EMPTY_DRAFT, ...initial })
  const updateDraft = useCallback(
    (patch: Partial<StatementDraft>) => setDraft((current) => ({ ...current, ...patch })),
    [],
  )
  const value = useMemo(() => ({ draft, updateDraft }), [draft, updateDraft])

  return <StatementDraftContext.Provider value={value}>{children}</StatementDraftContext.Provider>
}

/** Sans fournisseur (formulaire utilisé seul), le brouillon est inerte. */
export function useStatementDraft(): StatementDraftContextValue {
  const context = useContext(StatementDraftContext)
  return context ?? { draft: EMPTY_DRAFT, updateDraft: () => {} }
}
