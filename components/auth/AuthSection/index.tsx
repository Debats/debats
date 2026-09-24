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

/** Deux lettres au plus : initiales d'un nom, ou début d'une adresse e-mail. */
function initials(displayName: string): string {
  const words = displayName.split(/[\s@._-]+/).filter(Boolean)
  const letters = words.length > 1 ? words.slice(0, 2).map((w) => w[0]) : displayName.slice(0, 2)
  return Array.from(letters).join('').toUpperCase()
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
    const displayName: string = user.user_metadata?.name || user.email || ''
    return (
      <div className={styles.section}>
        <Link href="/me" className={styles.avatar} title={displayName}>
          <span aria-hidden="true">{initials(displayName)}</span>
          <span className={styles.visuallyHidden}>Mon compte : {displayName}</span>
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
      <Button href="/inscription" variant="secondary" size="small">
        Inscription
      </Button>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}
