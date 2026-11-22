'use client'

import { useCallback, useRef, useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import {
  JointDeclarationOption,
  jointDeclarationFromSource,
  previewSignature,
  searchJointDeclarations,
} from '../../../app/actions/joint-declarations'
import { SignaturePreview } from '../../../domain/read-models/joint-declaration'
import { useStatementDraft } from '../StatementDraft'
import { Chosen } from './existing-or-new'
import {
  EMPTY_SOURCE_WATCH,
  hintFor,
  sourceAddress,
  sourceAnswered,
  sourceSettled,
  sourceTyped as addressTyped,
  SourceWatch,
} from './source-watch'

/**
 * A joint declaration the form opens on, with what signing it entails: the
 * page read the text to find it, so the form does not open on a reading.
 */
export interface DeclarationToSign {
  option: JointDeclarationOption
  preview: SignaturePreview
}

/**
 * Why the text chosen cannot be signed from here: the site no longer has it,
 * or reading it failed. Either way the form does not know what the signature
 * would make, so it does not send it.
 */
export type UnreadableText = 'missing' | 'failed'

export interface JointSignature {
  /** The form adds a signature of a joint declaration, not a statement of the author's own */
  signing: boolean
  /** Opens the signature, on a text already known when the source gave it away */
  start: (declaration?: JointDeclarationOption) => void
  /** Back to a statement of the author's own; the text chosen stays for a way back */
  stop: () => void
  /** The text chosen, in the shape its Combobox takes back */
  chosen?: Chosen
  choose: (chosen?: Chosen) => void
  search: (query: string) => Promise<Chosen[]>
  /** The id the signature is recorded on; undefined until a text is chosen */
  declarationId?: string
  /** The page of the text chosen, to lead back to once the signature is added */
  declarationSlug?: string
  /** What the signature will make; undefined while it is being read, or without a text */
  preview?: SignaturePreview
  /** Set when the text chosen could not be read: the signature is then not sent */
  unreadable?: UnreadableText
  /** Reads the text chosen again, after a reading that failed */
  readAgain: () => void
  /** A text the source typed in the form is the source of, until answered */
  hint?: JointDeclarationOption
  /** The source field holds another address: the hint follows, nothing is asked yet */
  sourceTyped: (sourceUrl: string) => void
  /** Asks whether a source is the one of a joint declaration the site knows */
  checkSource: (sourceUrl: string) => void
  dismissHint: () => void
}

/**
 * The door of the statement form onto joint declarations: whether the
 * contributor is adding a signature, of which text, and what it entails.
 *
 * A signature is not a field of the statement: it replaces the subject, the
 * position, the words, the source and the date, which are the text's. So it
 * is held apart from the other choices of the form, and the form asks it
 * what to submit.
 *
 * Like the author's hook, it reports to the rail's preview itself: what the
 * preview shows of a signature is the text, and the text is held here.
 */
export function useJointSignature(initial?: DeclarationToSign): JointSignature {
  const { updateDraft } = useStatementDraft()
  const [signing, setSigning] = useState(!!initial)
  const [declaration, setDeclaration] = useState<JointDeclarationOption | undefined>(
    initial?.option,
  )
  const [preview, setPreview] = useState<SignaturePreview | undefined>(initial?.preview)
  const [unreadable, setUnreadable] = useState<UnreadableText>()
  const [watch, setWatch] = useState<SourceWatch>(EMPTY_SOURCE_WATCH)
  /** The texts the search last offered: the Combobox hands back an id, the preview needs a slug */
  const offered = useRef(new Map<string, JointDeclarationOption>())
  /** The text whose preview is awaited: an answer for another one is stale */
  const awaited = useRef<string | undefined>(undefined)
  /** Sources the site was already asked about: the question is put once per address */
  const asked = useRef(new Set<string>())

  const read = useCallback(
    (option: JointDeclarationOption | undefined) => {
      awaited.current = option?.id
      setDeclaration(option)
      setPreview(undefined)
      setUnreadable(undefined)
      updateDraft({ declarationTitle: option?.title ?? '' })
      if (!option) return
      previewSignature(option.slug).then(
        (found) => {
          if (awaited.current !== option.id) return
          if (found) setPreview(found)
          else setUnreadable('missing')
        },
        (err) => {
          Sentry.captureException(err, { tags: { feature: 'joint-signature-preview' } })
          if (awaited.current === option.id) setUnreadable('failed')
        },
      )
    },
    [updateDraft],
  )

  const readAgain = useCallback(() => read(declaration), [declaration, read])

  const search = useCallback(async (query: string) => {
    const found = await searchJointDeclarations(query)
    offered.current = new Map(found.map((option) => [option.id, option]))
    return found.map((option) => ({ id: option.id, label: option.title }))
  }, [])

  const choose = useCallback(
    (chosen?: Chosen) => read(chosen ? offered.current.get(chosen.id) : undefined),
    [read],
  )

  const start = useCallback(
    (known?: JointDeclarationOption) => {
      setSigning(true)
      updateDraft({ signing: true })
      if (!known) return
      // « Yes, it is a signature » answers the question the hint was asking
      setWatch(sourceSettled)
      read(known)
    },
    [read, updateDraft],
  )

  const stop = useCallback(() => {
    setSigning(false)
    updateDraft({ signing: false })
  }, [updateDraft])

  const sourceTyped = useCallback(
    (sourceUrl: string) => setWatch((current) => addressTyped(current, sourceUrl)),
    [],
  )

  const checkSource = useCallback((sourceUrl: string) => {
    const address = sourceAddress(sourceUrl)
    setWatch((current) => addressTyped(current, address))
    if (!address || asked.current.has(address)) return
    asked.current.add(address)
    jointDeclarationFromSource(address).then(
      (found) => setWatch((current) => sourceAnswered(current, address, found)),
      (err) => {
        // The net is a courtesy: its failure is worth knowing, never worth stopping for
        Sentry.captureException(err, { tags: { feature: 'joint-source-hint' } })
        // Not answered, so not asked: leaving the field again puts the question again
        asked.current.delete(address)
      },
    )
  }, [])

  const dismissHint = useCallback(() => setWatch(sourceSettled), [])

  return {
    signing,
    start,
    stop,
    chosen: declaration && { id: declaration.id, label: declaration.title },
    choose,
    search,
    declarationId: declaration?.id,
    declarationSlug: declaration?.slug,
    preview,
    unreadable,
    readAgain,
    hint: hintFor(watch),
    sourceTyped,
    checkSource,
    dismissHint,
  }
}
