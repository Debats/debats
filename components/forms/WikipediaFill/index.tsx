'use client'

import { useCallback, useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import {
  FillFailure,
  fillFromWikipedia,
  WikipediaFacts,
} from '../../../app/actions/fill-from-wikipedia'
import styles from './WikipediaFill.module.css'

/** An empty field is answered here: the server is not called for nothing */
type Outcome = FillFailure | 'empty' | 'filled'

/** What was said, and about which address: editing the address makes it stale */
interface Said {
  url: string
  outcome: Outcome
}

interface WikipediaFillProps {
  /** The address as the field holds it at the moment of the click */
  url: string
  onFilled: (facts: WikipediaFacts) => void
}

const MESSAGES: Record<FillFailure | 'empty', string> = {
  empty: 'Collez d’abord l’adresse de la page Wikipédia ci-dessus.',
  not_wikipedia: 'Ce n’est pas une adresse de page Wikipédia (https://fr.wikipedia.org/wiki/…).',
  not_a_page: 'Cette page Wikipédia n’existe pas.',
  not_an_article:
    'Cette adresse mène à une catégorie, un portail ou une page de discussion, pas à un article. Ouvrez l’article sur Wikipédia et recopiez son adresse.',
  ambiguous:
    'Cette adresse mène à une page d’homonymie, qui ne décrit personne en particulier. Ouvrez la bonne page sur Wikipédia et recopiez son adresse.',
  unreachable: 'Wikipédia n’a pas répondu. Réessayez dans un instant.',
  not_allowed: 'Votre session a expiré. Reconnectez-vous pour utiliser le remplissage.',
}

const FILLED =
  'Nom et présentation recopiés depuis Wikipédia. Relisez-les : un résumé Wikipédia porte parfois des appréciations, que le site ne reprend pas.'

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
 * Shared by the four forms that carry a Wikipedia address. What is shared is
 * the behaviour, not the layout: each places this button where its own design
 * wants it.
 */
export default function WikipediaFill({ url, onFilled }: WikipediaFillProps) {
  const [pending, setPending] = useState(false)
  const [said, setSaid] = useState<Said>()

  const fill = useCallback(async () => {
    if (!url.trim()) {
      setSaid({ url, outcome: 'empty' })
      return
    }

    setPending(true)
    setSaid(undefined)

    try {
      const result = await fillFromWikipedia(url)
      if (result.found) {
        onFilled({ name: result.name, presentation: result.presentation })
        setSaid({ url, outcome: 'filled' })
      } else {
        setSaid({ url, outcome: result.reason })
      }
    } catch (err) {
      Sentry.captureException(err)
      setSaid({ url, outcome: 'unreachable' })
    } finally {
      setPending(false)
    }
  }, [onFilled, url])

  /* What was said of another address says nothing of this one */
  const outcome = said?.url === url ? said.outcome : undefined

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
        {outcome === 'filled' && <p className={styles.note}>{FILLED}</p>}
        {outcome && outcome !== 'filled' && <p className={styles.failure}>{MESSAGES[outcome]}</p>}
      </div>
    </div>
  )
}
