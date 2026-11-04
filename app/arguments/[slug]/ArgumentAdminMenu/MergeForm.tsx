'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { mergeArgumentsAction } from '../../../actions/merge-arguments'
import { searchArguments } from '../../../actions/search-arguments'
import { ArgumentSuggestion } from '../../../../domain/read-models/argument'
import { plural } from '../../../../lib/plural'
import Button from '../../../../components/ui/Button'
import Combobox from '../../../../components/ui/Combobox'
import ConfirmAction from '../../../../components/ui/ConfirmAction'
import styles from './ArgumentAdminMenu.module.css'

interface MergeFormProps {
  argument: { id: string; title: string }
  onCancel: () => void
}

/** Le panneau « Fusionner dans… » du menu d'un argument. */
export default function MergeForm({ argument, onCancel }: MergeFormProps) {
  const router = useRouter()
  const [candidates, setCandidates] = useState<ArgumentSuggestion[]>([])
  const [targetId, setTargetId] = useState<string>()
  const target = candidates.find((a) => a.id === targetId)

  const search = useCallback(
    async (query: string) => {
      const results = (await searchArguments(query)).filter((a) => a.id !== argument.id)
      setCandidates(results)
      return results.map((a) => ({
        id: a.id,
        label: `${a.title} (${a.statementsCount} ${plural(a.statementsCount, 'prise de position', 'prises de position')})`,
      }))
    },
    [argument.id],
  )

  const handleMerge = useCallback(async () => {
    if (!target) return
    const result = await mergeArgumentsAction(argument.id, target.id)
    if (!result.success) throw new Error(result.error)
    router.push(`/arguments/${result.targetSlug}`)
    router.refresh()
  }, [argument.id, target, router])

  return (
    <div className={styles.panel}>
      <p className={styles.hint}>
        Les prises de position de « {argument.title} » mobiliseront l’argument choisi, et celui-ci
        disparaîtra.
      </p>
      <Combobox
        label="Fusionner dans"
        id="merge-target"
        name="targetId"
        placeholder="Rechercher un argument…"
        onSearch={search}
        onSelect={(id) => setTargetId(id)}
      />
      {target ? (
        <ConfirmAction
          open
          warning={`« ${argument.title} » sera fusionné dans « ${target.title} ». Cette action est irréversible.`}
          confirmLabel="Fusionner"
          pendingLabel="Fusion…"
          onConfirm={handleMerge}
          onCancel={onCancel}
        />
      ) : (
        <div className={styles.actions}>
          <Button type="button" variant="link" size="small" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      )}
    </div>
  )
}
