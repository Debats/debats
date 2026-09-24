'use client'

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { StatementType } from '../../../domain/entities/statement'

/** Ce que l'utilisateur a saisi jusqu'ici, pour l'aperçu en marge du formulaire. */
export interface StatementDraft {
  figureName: string
  subjectTitle: string
  positionTitle: string
  quote: string
  sourceName: string
  statedAt: string
  statementType: StatementType
}

export const EMPTY_DRAFT: StatementDraft = {
  figureName: '',
  subjectTitle: '',
  positionTitle: '',
  quote: '',
  sourceName: '',
  statedAt: '',
  statementType: 'declaration',
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
