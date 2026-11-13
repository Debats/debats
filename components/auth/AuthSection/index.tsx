'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '../../../infra/supabase/browser'
import type { User } from '@supabase/supabase-js'
import { CONTRIBUTE_HREF } from '../../../domain/read-models/hrefs'
import Button from '../../ui/Button'
import LoginModal from '../LoginModal'
import UserMenu from '../UserMenu'
import styles from './AuthSection.module.css'

interface AuthSectionProps {
  onAuthChange?: () => void
}

/**
 * Le bout de l'en-tête qui dépend de qui regarde : le menu de la personne
 * connectée, ou l'invitation à contribuer, à se connecter et à s'inscrire.
 */
export default function AuthSection({ onAuthChange }: AuthSectionProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        onAuthChange?.()
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [onAuthChange, router])

  if (user) {
    return (
      <div className={styles.section}>
        <UserMenu
          displayName={user.user_metadata?.name || user.email || ''}
          onSignOut={() => void createBrowserSupabaseClient().auth.signOut()}
        />
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <Button href={CONTRIBUTE_HREF} size="small">
        Contribuer
      </Button>
      <Button variant="link" onClick={() => setShowLogin(true)}>
        Connexion
      </Button>
      <Button href="/inscription" variant="secondary" size="small">
        Inscription
      </Button>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}
