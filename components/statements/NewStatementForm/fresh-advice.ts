import { FieldAdvice } from '../../../app/actions/proofread-contribution'
import { AdviceByField } from '../../ui/FieldAdvice'

/**
 * The advice that still holds when a reading comes back: a field written
 * since the reading was asked for is no longer the text that was read, so
 * what was said about it is dropped rather than left to mislead. Its next
 * leaving will ask again.
 */
export function freshAdvice(
  advice: readonly FieldAdvice[],
  writtenSince: ReadonlySet<string>,
): AdviceByField {
  return Object.fromEntries(
    advice
      .filter(({ field }) => !writtenSince.has(field))
      .map(({ field, verdict, note }) => [field, { verdict, note }]),
  )
}

/** How many fields got something other than « conforme » */
export const remarksIn = (advice: AdviceByField): number =>
  Object.values(advice).filter((a) => a?.verdict !== 'ok').length
