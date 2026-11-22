'use client'

import { useCallback, useRef, useState } from 'react'
import {
  JointDeclarationOption,
  jointDeclarationFromSource,
  previewSignature,
  searchJointDeclarations,
} from '../../../app/actions/joint-declarations'
import { SignaturePreview } from '../../../domain/read-models/joint-declaration'
import { Chosen } from './existing-or-new'

/** A joint declaration chosen, with what signing it entails once it was read */
export interface DeclarationToSign {
  option: JointDeclarationOption
  preview?: SignaturePreview
}

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
  /** A text the source typed in the form is the source of, until answered */
  hint?: JointDeclarationOption
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
 */
export function useJointSignature(initial?: DeclarationToSign): JointSignature {
  const [signing, setSigning] = useState(!!initial)
  const [declaration, setDeclaration] = useState<JointDeclarationOption | undefined>(
    initial?.option,
  )
  const [preview, setPreview] = useState<SignaturePreview | undefined>(initial?.preview)
  const [hint, setHint] = useState<JointDeclarationOption>()
  /** The texts the search last offered: the Combobox hands back an id, the preview needs a slug */
  const offered = useRef(new Map<string, JointDeclarationOption>())
  /** The text whose preview is awaited: an answer for another one is stale */
  const awaited = useRef<string | undefined>(initial?.option.id)
  /** Sources the site was already asked about: the question is put once per address */
  const asked = useRef(new Set<string>())

  const read = useCallback((option: JointDeclarationOption | undefined) => {
    awaited.current = option?.id
    setDeclaration(option)
    setPreview(undefined)
    if (!option) return
    void previewSignature(option.slug).then((found) => {
      if (awaited.current === option.id) setPreview(found ?? undefined)
    })
  }, [])

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
      setHint(undefined)
      if (known) read(known)
    },
    [read],
  )

  const stop = useCallback(() => setSigning(false), [])

  const checkSource = useCallback((sourceUrl: string) => {
    const address = sourceUrl.trim()
    if (!address || asked.current.has(address)) return
    asked.current.add(address)
    void jointDeclarationFromSource(address).then((found) => setHint(found ?? undefined))
  }, [])

  const dismissHint = useCallback(() => setHint(undefined), [])

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
    hint,
    checkSource,
    dismissHint,
  }
}
