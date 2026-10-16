/**
 * Image format identification from the file's own bytes.
 *
 * A file name and a declared MIME type are both claims, not facts: an avatar
 * stored as `.jpg` may hold PNG bytes. Consumers that must announce a MIME type
 * (the OpenGraph renderer) or accept an upload need the real format, so they
 * read it here from the signature instead of trusting the claim.
 */

/** The image formats the site identifies. */
export type ImageFormat = 'jpeg' | 'png' | 'webp'

const MIME_TYPES: Record<ImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** The MIME type matching a format. */
export function imageMimeType(format: ImageFormat): string {
  return MIME_TYPES[format]
}

/** Leading bytes identifying a format, `null` meaning "any byte at this offset". */
const SIGNATURES: ReadonlyArray<readonly [ImageFormat, ReadonlyArray<number | null>]> = [
  ['jpeg', [0xff, 0xd8, 0xff]],
  ['png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  // "RIFF" then the chunk size, which varies, then "WEBP"
  ['webp', [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
]

const matches = (bytes: Uint8Array, signature: ReadonlyArray<number | null>): boolean =>
  bytes.length >= signature.length &&
  signature.every((byte, index) => byte === null || bytes[index] === byte)

/** The real format of an image, or `null` if its signature is unknown. */
export function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  const found = SIGNATURES.find(([, signature]) => matches(bytes, signature))
  return found ? found[0] : null
}
