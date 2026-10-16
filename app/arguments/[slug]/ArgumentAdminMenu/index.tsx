'use client'

import { useState, useCallback, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { mergeArgumentsAction } from '../../../actions/merge-arguments'
import { renameArgumentAction } from '../../../actions/rename-argument'
import { searchArguments } from '../../../actions/search-arguments'
import { ArgumentSuggestion } from '../../../../domain/read-models/argument'
import { FieldErrors } from '../../../../domain/use-cases/types'
import { plural } from '../../../../lib/plural'
import AdminMenu from '../../../../components/ui/AdminMenu'
import Button from '../../../../components/ui/Button'
import Combobox from '../../../../components/ui/Combobox'
import ConfirmAction from '../../../../components/ui/ConfirmAction'
import TextArea from '../../../../components/ui/TextArea'
import TextField from '../../../../components/ui/TextField'
import styles from './ArgumentAdminMenu.module.css'

interface ArgumentAdminMenuProps {
  argument: { id: string; title: string; description: string }
  canRename: boolean
  canMerge: boolean
}

type Panel = 'rename' | 'merge'

/** Le menu « Gérer » d'un argument : le renommer ou le fusionner dans un autre. */
export default function ArgumentAdminMenu({
  argument,
  canRename,
  canMerge,
}: ArgumentAdminMenuProps) {
  const [panel, setPanel] = useState<Panel>()

  return (
    <AdminMenu
      actions={[
        ...(canRename
          ? [{ label: 'Renommer', icon: '✎', keepOpen: true, onClick: () => setPanel('rename') }]
          : []),
        ...(canMerge
          ? [
              {
                label: 'Fusionner dans…',
                icon: '⇄',
                keepOpen: true,
                onClick: () => setPanel('merge'),
              },
            ]
          : []),
      ]}
    >
      {panel === 'rename' && (
        <RenameForm argument={argument} onCancel={() => setPanel(undefined)} />
      )}
      {panel === 'merge' && <MergeForm argument={argument} onCancel={() => setPanel(undefined)} />}
    </AdminMenu>
  )
}

interface PanelProps {
  argument: ArgumentAdminMenuProps['argument']
  onCancel: () => void
}

function RenameForm({ argument, onCancel }: PanelProps) {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)
      const result = await renameArgumentAction(argument.id, new FormData(e.currentTarget))
      setIsPending(false)
      if (result.success) {
        router.push(`/arguments/${result.slug}`)
        router.refresh()
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors)
      } else {
        setError(result.error)
      }
    },
    [argument.id, router],
  )

  return (
    <form onSubmit={handleSubmit} className={styles.panel}>
      <TextField
        label="Titre"
        id="argument-title"
        name="title"
        required
        defaultValue={argument.title}
        error={fieldErrors?.title}
      />
      <TextArea
        label="Description"
        id="argument-description"
        name="description"
        rows={3}
        defaultValue={argument.description}
        placeholder="Facultative : ce que recouvre cet argument, pour le distinguer d’un argument proche"
        error={fieldErrors?.description}
      />
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <Button type="submit" size="small" disabled={isPending}>
          {isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button type="button" variant="link" size="small" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  )
}

function MergeForm({ argument, onCancel }: PanelProps) {
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
