import { JointDeclarationOption } from '../../../app/actions/joint-declarations'

/**
 * What the form knows of the source being typed, as far as joint declarations
 * go: the address the field holds right now, what the site answered about the
 * addresses it was asked about, and the ones the contributor already settled.
 *
 * The hint is derived from it, never stored: an answer is filed under the
 * address it is about, so one that comes back late, or about an address the
 * field no longer holds, cannot be shown under another.
 */
export interface SourceWatch {
  /** The address the field holds, trimmed */
  address: string
  /** A text, or null when no text bears the address */
  answers: ReadonlyMap<string, JointDeclarationOption | null>
  /** The addresses whose question was answered by the contributor, yes or no */
  settled: readonly string[]
}

export const EMPTY_SOURCE_WATCH: SourceWatch = { address: '', answers: new Map(), settled: [] }

/** An address as it is asked about and filed: the spaces around it mean nothing */
export const sourceAddress = (sourceUrl: string): string => sourceUrl.trim()

/** The field holds another address */
export const sourceTyped = (watch: SourceWatch, sourceUrl: string): SourceWatch => ({
  ...watch,
  address: sourceAddress(sourceUrl),
})

/** The site answered about an address: filed under it, whatever the field holds by now */
export const sourceAnswered = (
  watch: SourceWatch,
  address: string,
  found: JointDeclarationOption | null,
): SourceWatch => ({ ...watch, answers: new Map(watch.answers).set(address, found) })

/** The contributor answered the question for the address the field holds: it is not put again */
export const sourceSettled = (watch: SourceWatch): SourceWatch =>
  watch.settled.includes(watch.address)
    ? watch
    : { ...watch, settled: [...watch.settled, watch.address] }

/** The text the address in the field is the source of, until the contributor answered */
export const hintFor = (watch: SourceWatch): JointDeclarationOption | undefined =>
  watch.settled.includes(watch.address)
    ? undefined
    : (watch.answers.get(watch.address) ?? undefined)
