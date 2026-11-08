'use client'

import { useCallback, useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import { fillFromWikipedia, WikipediaFacts } from '../../../app/actions/fill-from-wikipedia'
import styles from './WikipediaFill.module.css'

/** What was said, and about which address: editing the address makes it stale */
type Said = { url: string; filled: true } | { url: string; filled: false; message: string }

interface WikipediaFillProps {
  /** The address as the field holds it at the moment of the click */
  url: string
  onFilled: (facts: WikipediaFacts) => void
}

/** The one thing said here: an empty field is answered without calling the server */
const NOTHING_TO_READ = 'Collez d’abord l’adresse de la page Wikipédia ci-dessus.'

const FILLED =
  'Nom et présentation recopiés depuis Wikipédia. Relisez-les : un résumé Wikipédia porte parfois des appréciations, que le site ne reprend pas.'

const UNEXPECTED = 'Le remplissage a échoué. Réessayez dans un instant.'

/**
 * Fills the name and the presentation from the Wikipedia page already entered.
 *
 * The contributor asks, and rereads: a Wikipedia summary is factual most of
 * the time, but Mélenchon's reads « souvent considéré comme relevant de la
 * gauche radicale », which this site does not take up. Hence the reminder
 * after a successful fill, and the fact that nothing leaves: the button fills
 * fields, it saves nothing.
 *
 * It overwrites what was typed, because a button that is clicked and does
 * nothing visible is worse than a replacement that was asked for.
 *
 * The button stays clickable on an empty field, and says so: a disabled button
 * takes no focus and explains nothing to someone who cannot see the field.
 *
 * Why a refusal is rendered and not composed: the action says what it could
 * not do, in words, as every other action of the site does with `error` and
 * `fieldErrors`. Two places holding the same sentences is what made the site
 * say the same thing in two ways.
 *
 * Shared by the four forms that carry a Wikipedia address. What is shared is
 * the behaviour, not the layout: each places this button where its own design
 * wants it.
 */
export default function WikipediaFill({ url, onFilled }: WikipediaFillProps) {
  const [pending, setPending] = useState(false)
  const [said, setSaid] = useState<Said>()

  const fill = useCallback(async () => {
    if (!url.trim()) {
      setSaid({ url, filled: false, message: NOTHING_TO_READ })
      return
    }

    setPending(true)
    setSaid(undefined)

    try {
      const result = await fillFromWikipedia(url)
      if (result.found) {
        onFilled({ name: result.name, presentation: result.presentation })
        setSaid({ url, filled: true })
      } else {
        setSaid({ url, filled: false, message: result.message })
      }
    } catch (err) {
      Sentry.captureException(err)
      setSaid({ url, filled: false, message: UNEXPECTED })
    } finally {
      setPending(false)
    }
  }, [onFilled, url])

  /* What was said of another address says nothing of this one */
  const outcome = said?.url === url ? said : undefined

  return (
    <div className={styles.fill}>
      <button type="button" className={styles.action} onClick={fill} disabled={pending}>
        {pending ? 'Lecture de Wikipédia…' : 'Remplir depuis Wikipédia'}
      </button>

      {/*
       * The live region is always here, and only its contents change. Mounted
       * together with its message, a screen reader may never announce it —
       * which is how `SearchField` already does it.
       */}
      <div role="status" aria-live="polite">
        {outcome?.filled && <p className={styles.note}>{FILLED}</p>}
        {outcome?.filled === false && <p className={styles.failure}>{outcome.message}</p>}
      </div>
    </div>
  )
}
