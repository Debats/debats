'use server'

import { headers } from 'next/headers'
import { createServerSupabaseClient } from '../../../infra/supabase/ssr'

type SignupResult =
  | { success: true }
  | { success: false; error: string }

export async function signup(token: string, formData: FormData): Promise<SignupResult> {
  const expectedToken = process.env.SIGNUP_SECRET_TOKEN
  if (!expectedToken || token !== expectedToken) {
    return { success: false, error: 'Lien d\u2019inscription invalide.' }
  }

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const passwordConfirmation = formData.get('password_confirmation') as string

  if (password !== passwordConfirmation) {
    return { success: false, error: 'Les mots de passe ne correspondent pas.' }
  }

  if (password.length < 8) {
    return { success: false, error: 'Le mot de passe doit contenir au moins 8 caractères.' }
  }

  const headersList = await headers()
  const origin = headersList.get('origin') || headersList.get('referer')?.replace(/\/[^/]*$/, '') || ''

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${origin}/api/auth/callback`,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
