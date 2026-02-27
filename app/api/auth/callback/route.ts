import { NextResponse } from 'next/server'
import { createSSRSupabaseClient } from '../../../../infra/supabase/ssr'

function getOrigin(request: Request): string {
  const headersList = request.headers
  const forwardedHost = headersList.get('x-forwarded-host')
  const forwardedProto = headersList.get('x-forwarded-proto') || 'https'

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  return new URL(request.url).origin
}

function redirectWithError(origin: string, message: string) {
  return NextResponse.redirect(`${origin}/?notice=${encodeURIComponent(message)}`)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = getOrigin(request)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return redirectWithError(origin, 'Code d\u2019authentification manquant.')
  }

  const supabase = await createSSRSupabaseClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return redirectWithError(
      origin,
      `Le lien de confirmation a expiré ou est invalide. (${exchangeError.message})`,
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { error: upsertError } = await supabase.from('contributors').upsert(
      { id: user.id, reputation: 0 },
      { onConflict: 'id', ignoreDuplicates: true },
    )

    if (upsertError) {
      return redirectWithError(
        origin,
        `Erreur lors de la création du profil contributeur. (${upsertError.message})`,
      )
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
