'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '../../../../components/ui/Button'
import TextArea from '../../../../components/ui/TextArea'
import { launchChantierAction } from '../../../actions/launch-chantier'
import styles from './LaunchChantierForm.module.css'

const EXAMPLES = [
  'Qui s’est positionné sur la taxe Zucman : tout le spectre, comptes rendus de séance d’abord.',
  'Tout ce que Marine Tondelier a dit sur les sujets du catalogue depuis 2025.',
  'Le débat de France 2 du 4 novembre : https://…',
]

/**
 * Where a chantier starts: one consigne, in French. The agent works out
 * where it starts from, names the chantier and answers with a plan on the
 * chantier's page.
 */
export default function LaunchChantierForm() {
  const router = useRouter()
  const [brief, setBrief] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  const launch = async () => {
    setPending(true)
    setError(undefined)
    const result = await launchChantierAction(brief)
    if (result.launched) {
      router.push(`/admin/chantiers/${result.chantier.id}`)
      return
    }
    setError(result.message)
    setPending(false)
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault()
        void launch()
      }}
    >
      <TextArea
        label="Qu’est-ce qu’on creuse ?"
        id="chantier-brief"
        rows={4}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="Un sujet, un angle, une personnalité, une organisation, une actualité, une adresse à lire…"
      />
      <p className={styles.hint}>
        C’est l’agent qui comprend d’où on part. Par exemple :{' '}
        {EXAMPLES.map((example, i) => (
          <span key={example}>
            {i > 0 && ' · '}« {example} »
          </span>
        ))}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" disabled={pending || brief.trim().length === 0}>
          {pending ? 'Lancement…' : 'Lancer le chantier'}
        </Button>
        <span className={styles.note}>
          L’agent répond d’abord par un plan. Vous pouvez le corriger avant qu’il ne cherche.
        </span>
      </div>
    </form>
  )
}
