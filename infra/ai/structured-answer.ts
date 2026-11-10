import type Anthropic from '@anthropic-ai/sdk'
import { Either } from 'effect'

/**
 * The text of a structured answer, decoded, or an error that says what went
 * wrong in the words the assist uses: a policy decline arrives as a 200 with
 * its own stop reason, an empty answer has no text block, and an answer the
 * schema does not accept is refused rather than passed off.
 */
export function structuredAnswer<T>(
  message: Anthropic.Message,
  decode: (value: unknown) => Either.Either<T, unknown>,
  what: string,
): T {
  if (message.stop_reason === 'refusal') {
    throw new Error(
      `${what} a été déclinée (${message.stop_details?.category ?? 'sans catégorie'})`,
    )
  }

  const text = message.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') {
    throw new Error(`${what} n’a rien répondu`)
  }

  const read = decode(JSON.parse(text.text))
  if (Either.isLeft(read)) {
    throw new Error(`${what} a répondu dans une forme inattendue`)
  }
  return read.right
}
