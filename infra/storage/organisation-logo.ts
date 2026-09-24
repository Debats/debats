import * as Sentry from '@sentry/nextjs'
import sharp from 'sharp'
import { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'logos'
const MAX_SIZE = 600

export class LogoStorageError extends Error {
  readonly _tag = 'LogoStorageError'
}

/** Storage path of an organisation's logo, served through /logos/<slug>.png */
export const logoPath = (slug: string) => `${slug}.png`

/**
 * Resizes a logo to fit in a 600px square, keeping transparency, and stores it.
 * Throws a LogoStorageError (already reported to Sentry) when the upload fails.
 */
export async function uploadOrganisationLogo(
  supabase: SupabaseClient,
  slug: string,
  file: File,
): Promise<void> {
  const resized = await sharp(Buffer.from(await file.arrayBuffer()))
    .resize(MAX_SIZE, MAX_SIZE, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer()

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(logoPath(slug), resized, { contentType: 'image/png', upsert: true })

  if (error) {
    const wrapped = new LogoStorageError(`Logo upload failed: ${error.message}`)
    Sentry.captureException(wrapped, { extra: { slug } })
    throw wrapped
  }
}

/** Removes a logo; a failure is reported to Sentry but does not block the caller. */
export async function removeOrganisationLogo(
  supabase: SupabaseClient,
  slug: string,
): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([logoPath(slug)])
  if (error) {
    Sentry.captureMessage(`Logo removal failed: ${error.message}`, {
      level: 'warning',
      extra: { slug },
    })
  }
}

/**
 * Follows a slug change: copies the logo to its new path and removes the old one.
 * The logo is optional, so a missing source is expected and only logged.
 */
export async function moveOrganisationLogo(
  supabase: SupabaseClient,
  fromSlug: string,
  toSlug: string,
): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).copy(logoPath(fromSlug), logoPath(toSlug))
  if (error) {
    Sentry.captureMessage(`Logo copy skipped: ${error.message}`, {
      level: 'warning',
      extra: { fromSlug, toSlug },
    })
    return
  }
  await removeOrganisationLogo(supabase, fromSlug)
}
