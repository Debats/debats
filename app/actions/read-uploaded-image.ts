import { Either } from 'effect'
import { validateUploadedImage } from '../../domain/services/image-format'

/**
 * Reads an uploaded image's bytes and refuses a file we cannot re-encode.
 *
 * The form's `accept` attribute only filters the file picker, and nothing stops
 * a request from carrying anything at all, so the bytes are checked here before
 * they ever reach the image pipeline.
 */
export async function readUploadedImage(image: File): Promise<Either.Either<Uint8Array, string>> {
  const bytes = new Uint8Array(await image.arrayBuffer())
  const validation = validateUploadedImage(bytes)

  return Either.isLeft(validation) ? Either.left(validation.left) : Either.right(bytes)
}
