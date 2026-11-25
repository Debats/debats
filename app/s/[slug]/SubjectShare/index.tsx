'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Dialog } from 'radix-ui'
import * as Sentry from '@sentry/nextjs'
import Button from '../../../../components/ui/Button'
import ShareIcon from '../../../../components/ui/ShareButton/ShareIcon'
import { useShareButtonContext } from '../../../../components/ui/ShareButton/ShareButtonContext'
import { listShareSlides, ShareSlide } from '../../../actions/list-share-slides'
import SlideStrip from './SlideStrip'
import { usePreparedImages } from './use-prepared-images'
import styles from './SubjectShare.module.css'

interface SubjectShareProps {
  slug: string
  title: string
  /** The whole address of the subject page, for who shares the link alone */
  url: string
  /** The text that goes with the images where they are posted; it ends on the link to the subject */
  caption: string
}

/** What the dialogue copies: the text that goes with the images, or the link alone */
type Copied = 'text' | 'link'

/**
 * The pause between two downloads, in milliseconds. A browser drops downloads
 * started in the same instant: it keeps the last and forgets the others.
 */
const BETWEEN_DOWNLOADS = 300

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

/** Whether this browser has a share sheet: known on the client only, never while rendering on the server */
const neverChanges = () => () => {}
const useShareSheet = (): boolean =>
  useSyncExternalStore(
    neverChanges,
    () => typeof navigator.share === 'function',
    () => false,
  )

const SHARE_FAULT =
  'Le partage n’a pas abouti. Vous pouvez télécharger les images et copier le texte.'

const IMAGES_FAULT =
  'Les images n’ont pas pu être préparées pour le partage. Réessayez dans un instant ; elles restent téléchargeables, et le texte peut être copié.'

const SLIDES_FAULT = 'Le carrousel n’a pas pu être chargé. Réessayez dans un instant.'

const COPY_FAULT =
  'La copie n’a pas abouti. Vous pouvez sélectionner le texte ci-dessus, qui se termine par le lien, et le copier à la main.'

/**
 * Sharing a subject: a carousel of images that say who thinks what, and the
 * text to post with them. The text carries the link to the subject, since
 * nobody can click an image; the link can also be copied alone, for who wants
 * neither the images nor the text.
 */
export default function SubjectShare({ slug, title, url, caption }: SubjectShareProps) {
  const [slides, setSlides] = useState<ShareSlide[] | null>(null)
  const [downloading, setDownloading] = useState(false)
  // The download link of each slide, by slide: the strip hands them over as it mounts
  const links = useRef(new Map<string, HTMLAnchorElement>())
  const [copied, setCopied] = useState<Copied | null>(null)
  const [fault, setFault] = useState<string | null>(null)
  const { prepare, files, failed } = usePreparedImages()
  const hasShareSheet = useShareSheet()
  // A subject nobody spoke on has no slide: its text is still worth sharing
  const hasSlides = slides !== null && slides.length > 0

  // The header of a small screen hides its own share icon when the page has one
  const { register } = useShareButtonContext()
  useEffect(() => register(), [register])

  async function opened(open: boolean) {
    if (!open || slides) return
    setFault(null)
    try {
      const listed = await listShareSlides(slug)
      setSlides(listed)
      if (hasShareSheet && listed.length > 0) void prepare(listed)
    } catch (cause) {
      Sentry.captureException(cause)
      setFault(SLIDES_FAULT)
    }
  }

  function keepLink(key: string, link: HTMLAnchorElement | null) {
    if (link) links.current.set(key, link)
    else links.current.delete(key)
  }

  /** Every image as a file of its own, in the order of the carousel: each link is followed in turn */
  async function downloadAll() {
    setDownloading(true)
    for (const slide of slides ?? []) {
      links.current.get(slide.key)?.click()
      await pause(BETWEEN_DOWNLOADS)
    }
    setDownloading(false)
  }

  async function copy(what: Copied) {
    setFault(null)
    try {
      await navigator.clipboard.writeText(what === 'link' ? url : caption)
      setCopied(what)
      setTimeout(() => setCopied(null), 2000)
    } catch (cause) {
      // A browser refuses its clipboard to a page it does not trust, or that lost the focus
      Sentry.captureException(cause)
      setFault(COPY_FAULT)
    }
  }

  async function share() {
    if (!files) return
    setFault(null)
    const withImages = { files, text: caption }
    try {
      // A browser that cannot share files still shares the text, which carries the link
      await navigator.share(
        navigator.canShare?.(withImages) ? withImages : { title, text: caption },
      )
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return
      Sentry.captureException(cause)
      setFault(SHARE_FAULT)
    }
  }

  return (
    <Dialog.Root onOpenChange={opened}>
      <Dialog.Trigger asChild>
        <button type="button" className={styles.trigger} aria-label="Partager ce sujet">
          <ShareIcon size={16} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        {/* The title says it all: the dialogue has no description to be announced with */}
        <Dialog.Content className={styles.dialog} aria-describedby={undefined}>
          <Dialog.Title className={styles.title}>Partager ce sujet</Dialog.Title>

          {hasSlides && <SlideStrip title={title} slides={slides} onLink={keepLink} />}
          {slides?.length === 0 && (
            <p className={styles.loading}>
              Ce sujet n’a pas encore de prise de position : il n’y a pas d’image à partager. Le
              texte, lui, peut l’être.
            </p>
          )}
          {!slides && !fault && <p className={styles.loading}>Préparation du carrousel…</p>}

          <div className={styles.side}>
            <p className={styles.text}>{caption}</p>

            <div className={styles.actions}>
              <Button onClick={downloadAll} disabled={!hasSlides || downloading}>
                {downloading ? 'Téléchargement…' : 'Télécharger les images'}
              </Button>
              <Button variant="secondary" onClick={() => copy('text')}>
                {copied === 'text' ? 'Texte copié !' : 'Copier le texte'}
              </Button>
              <Button variant="secondary" onClick={() => copy('link')}>
                {copied === 'link' ? 'Lien copié !' : 'Copier le lien seul'}
              </Button>
              {hasShareSheet && hasSlides && !failed && (
                <Button variant="secondary" onClick={share} disabled={!files}>
                  {files ? 'Partager…' : 'Préparation…'}
                </Button>
              )}
            </div>

            {downloading && (
              <p className={styles.hint}>
                Votre navigateur peut vous demander d’autoriser le téléchargement de plusieurs
                fichiers.
              </p>
            )}

            {(fault || failed) && (
              <p role="alert" className={styles.fault}>
                {fault ?? IMAGES_FAULT}
              </p>
            )}
          </div>

          <Dialog.Close asChild>
            <button type="button" className={styles.close}>
              Fermer
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
