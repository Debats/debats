'use client'

import { useState, useTransition } from 'react'
import * as Sentry from '@sentry/nextjs'
import Button from '../../../components/ui/Button'
import { FigureSpotlight } from '../../../domain/read-models/figure-spotlight'
import { figureHref } from '../../../domain/read-models/hrefs'
import { anotherIndex } from '../../../lib/another-index'
import { showFigureSpotlight } from '../show-figure-spotlight'
import SpotlightIdentity from './SpotlightIdentity'
import SpotlightQuote from './SpotlightQuote'
import SpotlightSubjects from './SpotlightSubjects'
import styles from './RandomFigure.module.css'

interface RandomFigureProps {
  /** La personnalité affichée au chargement, choisie côté serveur pour que l'hydratation soit stable */
  initial: FigureSpotlight
  /** Les personnalités parmi lesquelles tirer la suivante */
  slugs: string[]
}

/** Encart du rail : une personnalité au hasard, présentée par ce qu'elle a dit, à relancer d'un clic. */
export default function RandomFigure({ initial, slugs }: RandomFigureProps) {
  const [spotlight, setSpotlight] = useState(initial)
  const [failed, setFailed] = useState(false)
  const [pending, startTransition] = useTransition()

  const showAnother = () =>
    startTransition(async () => {
      const slug = slugs[anotherIndex(slugs.indexOf(spotlight.slug), slugs.length)]
      try {
        const next = await showFigureSpotlight(slug)
        if (next) setSpotlight(next)
        setFailed(next === null)
      } catch (error) {
        Sentry.captureException(error)
        setFailed(true)
      }
    })

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Une personnalité au hasard</h2>
      <SpotlightIdentity spotlight={spotlight} />
      {spotlight.presentation && <p className={styles.presentation}>{spotlight.presentation}</p>}
      {spotlight.quote && <SpotlightQuote quote={spotlight.quote} />}
      <SpotlightSubjects figureSlug={spotlight.slug} latest={spotlight.latest} />
      <div className={styles.actions}>
        <Button href={figureHref(spotlight.slug)} variant="secondary" size="small">
          Voir sa page
        </Button>
        {slugs.length > 1 && (
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={showAnother}
            disabled={pending}
          >
            Une autre
          </Button>
        )}
      </div>
      {failed && (
        <p className={styles.failed} role="alert">
          Impossible d’en afficher une autre pour le moment.
        </p>
      )}
    </section>
  )
}
