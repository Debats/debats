import { PositionVerdict } from '../../domain/use-cases/statement-judgements'

/**
 * Brings back to its expected shape what a client says of the positions the
 * author already took.
 *
 * A Server Function receives JSON, not the type it declares, and the command
 * walks through this array without questioning it: an item that does not
 * name a position and a verdict is not an answer, and is dropped.
 */
export function positionVerdictsOf(value: unknown): PositionVerdict[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) =>
    item &&
    typeof item === 'object' &&
    typeof item.positionId === 'string' &&
    item.positionId !== '' &&
    typeof item.compatible === 'boolean'
      ? [{ positionId: item.positionId, compatible: item.compatible }]
      : [],
  )
}
