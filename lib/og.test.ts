import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadAvatar, loadLogo } from './og'

const captureException = vi.fn()
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}))

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x01, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
])

const respondWith = (bytes: Uint8Array, status = 200) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
  })

const declaredMimeType = (dataUri: string) => dataUri.slice('data:'.length, dataUri.indexOf(';'))

describe('loadAvatar', () => {
  beforeEach(() => captureException.mockClear())
  afterEach(() => vi.unstubAllGlobals())

  it('should announce the MIME type of the bytes, not the one the file name suggests', async () => {
    // Regression: an avatar stored as "<slug>.jpg" actually holding PNG bytes
    // made the OpenGraph renderer parse PNG as JPEG and throw, returning a 503.
    vi.stubGlobal('fetch', respondWith(PNG_BYTES))

    const dataUri = await loadAvatar('delphine-batho')

    expect(dataUri).not.toBeNull()
    expect(declaredMimeType(dataUri!)).toBe('image/png')
  })

  it('should announce image/jpeg for an actual JPEG', async () => {
    vi.stubGlobal('fetch', respondWith(JPEG_BYTES))

    const dataUri = await loadAvatar('emmanuel-macron')

    expect(declaredMimeType(dataUri!)).toBe('image/jpeg')
  })

  it('should drop an image the renderer cannot embed and report it', async () => {
    vi.stubGlobal('fetch', respondWith(WEBP_BYTES))

    expect(await loadAvatar('whoever')).toBeNull()
    expect(captureException).toHaveBeenCalledOnce()
  })

  it('should drop a file that is not an image and report it', async () => {
    vi.stubGlobal('fetch', respondWith(new Uint8Array([0x25, 0x50, 0x44, 0x46])))

    expect(await loadAvatar('whoever')).toBeNull()
    expect(captureException).toHaveBeenCalledOnce()
  })

  it('should report a missing avatar, since every figure must have one', async () => {
    vi.stubGlobal('fetch', respondWith(new Uint8Array(), 404))

    expect(await loadAvatar('unknown')).toBeNull()
    expect(captureException).toHaveBeenCalledOnce()
  })

  it('should report a storage failure instead of hiding it', async () => {
    vi.stubGlobal('fetch', respondWith(new Uint8Array(), 500))

    expect(await loadAvatar('whoever')).toBeNull()
    expect(captureException).toHaveBeenCalledOnce()
  })

  it('should report a network error instead of hiding it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))

    expect(await loadAvatar('whoever')).toBeNull()
    expect(captureException).toHaveBeenCalledOnce()
  })
})

describe('loadLogo', () => {
  beforeEach(() => captureException.mockClear())
  afterEach(() => vi.unstubAllGlobals())

  it('should announce the MIME type of the bytes for a logo too', async () => {
    vi.stubGlobal('fetch', respondWith(JPEG_BYTES))

    const dataUri = await loadLogo('un-parti')

    expect(declaredMimeType(dataUri!)).toBe('image/jpeg')
  })

  it('should stay quiet when an organisation simply has no logo', async () => {
    vi.stubGlobal('fetch', respondWith(new Uint8Array(), 404))

    expect(await loadLogo('un-parti-sans-logo')).toBeNull()
    expect(captureException).not.toHaveBeenCalled()
  })
})
