'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '../../../infra/supabase/browser'
import type { User } from '@supabase/supabase-js'
import Button from '../../ui/Button'
import LoginModal from '../LoginModal'
import styles from './AuthSection.module.css'

interface AuthSectionProps {
  onAuthChange?: () => void
}

export default function AuthSection({ onAuthChange }: AuthSectionProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      onAuthChange?.()
      router.refresh()
    })

    return () => subscription.unsubscribe()
  }, [onAuthChange, router])

  if (user) {
    const displayName = user.user_metadata?.name || user.email
    return (
      <div className={styles.section}>
        <Link href="/me" className={styles.userName}>
          {displayName}
        </Link>
        <Button
          variant="link"
          onClick={async () => {
            const supabase = createBrowserSupabaseClient()
            await supabase.auth.signOut()
          }}
        >
          Déconnexion
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <Button variant="link" onClick={() => setShowLogin(true)}>
        Connexion
      </Button>
      <Link href="/inscription" className={styles.signupLink}>
        Inscription
      </Link>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}
