import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { readUploadedImage } from './read-uploaded-image'

const upload = (bytes: number[], name: string) => new File([new Uint8Array(bytes)], name)

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x24, 0x01, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]

describe('readUploadedImage', () => {
  it('should return the bytes of an accepted image', async () => {
    const result = await readUploadedImage(upload(WEBP, 'photo.webp'))

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(Array.from(result.right)).toStrictEqual(WEBP)
    }
  })

  it('should refuse a file that is not an image, whatever its name claims', async () => {
    const result = await readUploadedImage(upload(PDF, 'photo.jpg'))

    expect(Either.isLeft(result)).toBe(true)
  })

  it('should refuse an empty file', async () => {
    expect(Either.isLeft(await readUploadedImage(upload([], 'photo.jpg')))).toBe(true)
  })

  it('should accept a JPEG', async () => {
    expect(Either.isRight(await readUploadedImage(upload(JPEG, 'photo.jpg')))).toBe(true)
  })
})
