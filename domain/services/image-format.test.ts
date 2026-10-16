import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { detectImageFormat, imageMimeType, validateUploadedImage } from './image-format'

/** Minimal byte sequences carrying each format's signature. */
const signatures = {
  jpeg: [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00],
  // "RIFF" + 4 size bytes + "WEBP"
  webp: [0x52, 0x49, 0x46, 0x46, 0x24, 0x01, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50],
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34],
  // "RIFF" container holding audio, not an image
  wav: [0x52, 0x49, 0x46, 0x46, 0x24, 0x01, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45],
}

const bytes = (signature: number[]) => new Uint8Array(signature)

describe('detectImageFormat', () => {
  it('should detect a JPEG from its signature', () => {
    expect(detectImageFormat(bytes(signatures.jpeg))).toBe('jpeg')
  })

  it('should detect a PNG from its signature', () => {
    expect(detectImageFormat(bytes(signatures.png))).toBe('png')
  })

  it('should detect a WebP from its signature', () => {
    expect(detectImageFormat(bytes(signatures.webp))).toBe('webp')
  })

  it('should return null for a document that is not an image', () => {
    expect(detectImageFormat(bytes(signatures.pdf))).toBeNull()
  })

  it('should return null for a RIFF container that is not WebP', () => {
    expect(detectImageFormat(bytes(signatures.wav))).toBeNull()
  })

  it('should return null for bytes too short to carry a signature', () => {
    expect(detectImageFormat(bytes([0xff, 0xd8]))).toBeNull()
    expect(detectImageFormat(new Uint8Array())).toBeNull()
  })
})

describe('imageMimeType', () => {
  it('should give the MIME type of each format', () => {
    expect(imageMimeType('jpeg')).toBe('image/jpeg')
    expect(imageMimeType('png')).toBe('image/png')
    expect(imageMimeType('webp')).toBe('image/webp')
  })
})

describe('validateUploadedImage', () => {
  it('should accept a JPEG', () => {
    expect(Either.isRight(validateUploadedImage(bytes(signatures.jpeg)))).toBe(true)
  })

  it('should accept a PNG', () => {
    expect(Either.isRight(validateUploadedImage(bytes(signatures.png)))).toBe(true)
  })

  it('should accept a WebP', () => {
    expect(Either.isRight(validateUploadedImage(bytes(signatures.webp)))).toBe(true)
  })

  it('should reject a file that is not an image, naming the accepted formats', () => {
    const result = validateUploadedImage(bytes(signatures.pdf))

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('JPEG')
      expect(result.left).toContain('PNG')
      expect(result.left).toContain('WebP')
    }
  })

  it('should reject an empty file', () => {
    expect(Either.isLeft(validateUploadedImage(new Uint8Array()))).toBe(true)
  })

  it('should reject a file whose name lies about its content', () => {
    // A ".jpg" holding neither JPEG nor any other accepted signature
    expect(Either.isLeft(validateUploadedImage(bytes(signatures.wav)))).toBe(true)
  })
})
