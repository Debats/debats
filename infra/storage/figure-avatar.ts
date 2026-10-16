import * as Sentry from '@sentry/nextjs'
import sharp from 'sharp'
import { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'avatars'
const MAX_SIZE = 800
const JPEG_QUALITY = 85

export class AvatarStorageError extends Error {
  readonly _tag = 'AvatarStorageError'
}

/** Storage path of a public figure's avatar, served through /avatars/<slug>.jpg */
export const avatarPath = (slug: string) => `${slug}.jpg`

/**
 * Resizes a photo to fit in an 800px square and stores it as JPEG, whatever the
 * source format was. Keeping a single stored format matters: the OpenGraph
 * renderer announces a MIME type from the bytes it is given, and only JPEG and
 * PNG have a parser there.
 *
 * Throws an AvatarStorageError (already reported to Sentry) when the upload fails.
 */
export async function uploadFigureAvatar(
  supabase: SupabaseClient,
  slug: string,
  photo: Uint8Array,
): Promise<void> {
  const resized = await sharp(photo)
    .resize(MAX_SIZE, MAX_SIZE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer()

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(avatarPath(slug), resized, { contentType: 'image/jpeg', upsert: true })

  if (error) {
    const wrapped = new AvatarStorageError(`Avatar upload failed: ${error.message}`)
    Sentry.captureException(wrapped, { extra: { slug } })
    throw wrapped
  }
}

/** Removes an avatar; a failure is reported to Sentry but does not block the caller. */
export async function removeFigureAvatar(supabase: SupabaseClient, slug: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([avatarPath(slug)])
  if (error) {
    Sentry.captureMessage(`Avatar removal failed: ${error.message}`, {
      level: 'warning',
      extra: { slug },
    })
  }
}

/**
 * Follows a slug change: copies the avatar to its new path and removes the old one.
 * A failure is reported but does not block the rename.
 */
export async function moveFigureAvatar(
  supabase: SupabaseClient,
  fromSlug: string,
  toSlug: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .copy(avatarPath(fromSlug), avatarPath(toSlug))

  if (error) {
    Sentry.captureMessage(`Avatar copy failed: ${error.message}`, {
      level: 'warning',
      extra: { fromSlug, toSlug },
    })
    return
  }

  await removeFigureAvatar(supabase, fromSlug)
}
