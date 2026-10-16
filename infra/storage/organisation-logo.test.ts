import { describe, it, expect, vi, beforeEach } from 'vitest'
import sharp from 'sharp'
import { SupabaseClient } from '@supabase/supabase-js'
import { detectImageFormat } from '../../domain/services/image-format'
import {
  LogoStorageError,
  logoPath,
  moveOrganisationLogo,
  uploadOrganisationLogo,
} from './organisation-logo'

const captureException = vi.fn()
const captureMessage = vi.fn()
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureException(...args),
  captureMessage: (...args: unknown[]) => captureMessage(...args),
}))

type Upload = { path: string; body: Uint8Array; options: { contentType?: string } }

/** A Supabase stub recording what the storage bucket was asked to do. */
function storageStub(failures: { upload?: string; copy?: string } = {}) {
  const uploads: Upload[] = []
  const copies: Array<[string, string]> = []
  const removals: string[][] = []

  const client = {
    storage: {
      from: (bucket: string) => {
        expect(bucket).toBe('logos')
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
            return { error: null }
          },
        }
      },
    },
  } as unknown as SupabaseClient

  return { client, uploads, copies, removals }
}

const squareImage = (format: 'webp' | 'png' | 'jpeg', size = 1000) =>
  sharp({ create: { width: size, height: size, channels: 3, background: '#6b4ba3' } })
    [format]()
    .toBuffer()

describe('uploadOrganisationLogo', () => {
  beforeEach(() => {
    captureException.mockClear()
    captureMessage.mockClear()
  })

  it('should store a WebP logo as PNG', async () => {
    const { client, uploads } = storageStub()

    await uploadOrganisationLogo(client, 'un-parti', await squareImage('webp'))

    expect(uploads).toHaveLength(1)
    expect(uploads[0].path).toBe('un-parti.png')
    expect(uploads[0].options.contentType).toBe('image/png')
    // The guarantee the OpenGraph renderer depends on: the bytes really are PNG
    expect(detectImageFormat(uploads[0].body)).toBe('png')
  })

  it('should fit the logo inside a 600px square', async () => {
    const { client, uploads } = storageStub()

    await uploadOrganisationLogo(client, 'un-parti', await squareImage('webp', 1200))

    const { width, height } = await sharp(uploads[0].body).metadata()
    expect(width).toBe(600)
    expect(height).toBe(600)
  })

  it('should report and throw when the upload fails', async () => {
    const { client } = storageStub({ upload: 'bucket unreachable' })

    await expect(
      uploadOrganisationLogo(client, 'un-parti', await squareImage('png')),
    ).rejects.toBeInstanceOf(LogoStorageError)
    expect(captureException).toHaveBeenCalledOnce()
  })
})

describe('moveOrganisationLogo', () => {
  beforeEach(() => captureMessage.mockClear())

  it('should copy the logo then remove the old one', async () => {
    const { client, copies, removals } = storageStub()

    await moveOrganisationLogo(client, 'ancien-parti', 'nouveau-parti')

    expect(copies).toStrictEqual([['ancien-parti.png', 'nouveau-parti.png']])
    expect(removals).toStrictEqual([['ancien-parti.png']])
  })

  it('should keep the old logo when the copy fails, rather than lose it', async () => {
    const { client, removals } = storageStub({ copy: 'source missing' })

    await moveOrganisationLogo(client, 'ancien-parti', 'nouveau-parti')

    expect(removals).toStrictEqual([])
    expect(captureMessage).toHaveBeenCalledOnce()
  })
})

describe('logoPath', () => {
  it('should name the object after the slug, with a .png extension', () => {
    expect(logoPath('un-parti')).toBe('un-parti.png')
  })
})
