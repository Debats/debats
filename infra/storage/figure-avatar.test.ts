import { describe, it, expect, vi, beforeEach } from 'vitest'
import sharp from 'sharp'
import { SupabaseClient } from '@supabase/supabase-js'
import { detectImageFormat } from '../../domain/services/image-format'
import {
  AvatarStorageError,
  avatarPath,
  moveFigureAvatar,
  uploadFigureAvatar,
} from './figure-avatar'

const captureException = vi.fn()
const captureMessage = vi.fn()
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureException(...args),
  captureMessage: (...args: unknown[]) => captureMessage(...args),
}))

type Upload = { path: string; body: Uint8Array; options: { contentType?: string } }

/** A Supabase stub recording what the storage bucket was asked to do. */
function storageStub(failures: { upload?: string; copy?: string; remove?: string } = {}) {
  const uploads: Upload[] = []
  const copies: Array<[string, string]> = []
  const removals: string[][] = []

  const client = {
    storage: {
      from: (bucket: string) => {
        expect(bucket).toBe('avatars')
        return {
          upload: async (path: string, body: Uint8Array, options: { contentType?: string }) => {
            uploads.push({ path, body, options })
            return { error: failures.upload ? { message: failures.upload } : null }
          },
          copy: async (from: string, to: string) => {
            copies.push([from, to])
            return { error: failures.copy ? { message: failures.copy } : null }
          },
          remove: async (paths: string[]) => {
            removals.push(paths)
            return { error: failures.remove ? { message: failures.remove } : null }
          },
        }
      },
    },
  } as unknown as SupabaseClient

  return { client, uploads, copies, removals }
}

const squareImage = (format: 'webp' | 'png' | 'jpeg', size = 1000) =>
  sharp({ create: { width: size, height: size, channels: 3, background: '#e3243f' } })
    [format]()
    .toBuffer()

describe('uploadFigureAvatar', () => {
  beforeEach(() => {
    captureException.mockClear()
    captureMessage.mockClear()
  })

  it('should store a WebP photo as JPEG', async () => {
    const { client, uploads } = storageStub()

    await uploadFigureAvatar(client, 'une-personnalite', await squareImage('webp'))

    expect(uploads).toHaveLength(1)
    expect(uploads[0].path).toBe('une-personnalite.jpg')
    expect(uploads[0].options.contentType).toBe('image/jpeg')
    // The guarantee the OpenGraph renderer depends on: the bytes really are JPEG
    expect(detectImageFormat(uploads[0].body)).toBe('jpeg')
  })

  it('should store a PNG photo as JPEG too', async () => {
    const { client, uploads } = storageStub()

    await uploadFigureAvatar(client, 'une-personnalite', await squareImage('png'))

    expect(detectImageFormat(uploads[0].body)).toBe('jpeg')
  })

  it('should fit the photo inside an 800px square', async () => {
    const { client, uploads } = storageStub()

    await uploadFigureAvatar(client, 'une-personnalite', await squareImage('webp', 1600))

    const { width, height } = await sharp(uploads[0].body).metadata()
    expect(width).toBe(800)
    expect(height).toBe(800)
  })

  it('should not enlarge a photo smaller than the target', async () => {
    const { client, uploads } = storageStub()

    await uploadFigureAvatar(client, 'une-personnalite', await squareImage('webp', 300))

    const { width } = await sharp(uploads[0].body).metadata()
    expect(width).toBe(300)
  })

  it('should report and throw when the upload fails', async () => {
    const { client } = storageStub({ upload: 'bucket unreachable' })

    await expect(
      uploadFigureAvatar(client, 'une-personnalite', await squareImage('jpeg')),
    ).rejects.toBeInstanceOf(AvatarStorageError)
    expect(captureException).toHaveBeenCalledOnce()
  })
})

describe('moveFigureAvatar', () => {
  beforeEach(() => captureMessage.mockClear())

  it('should copy the avatar then remove the old one', async () => {
    const { client, copies, removals } = storageStub()

    await moveFigureAvatar(client, 'ancien-nom', 'nouveau-nom')

    expect(copies).toStrictEqual([['ancien-nom.jpg', 'nouveau-nom.jpg']])
    expect(removals).toStrictEqual([['ancien-nom.jpg']])
  })

  it('should keep the old avatar when the copy fails, rather than lose it', async () => {
    const { client, removals } = storageStub({ copy: 'source missing' })

    await moveFigureAvatar(client, 'ancien-nom', 'nouveau-nom')

    expect(removals).toStrictEqual([])
    expect(captureMessage).toHaveBeenCalledOnce()
  })
})

describe('avatarPath', () => {
  it('should name the object after the slug, with a .jpg extension', () => {
    expect(avatarPath('jean-dupont')).toBe('jean-dupont.jpg')
  })
})
