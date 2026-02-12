'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '../../../infra/supabase/browser'
import Modal from '../Modal'
import TextField from '../../ui/TextField'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import styles from './LoginModal.module.css'

interface LoginModalProps {
  onClose: () => void
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Courriel ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className={styles.title}>Connexion</h2>

      {error && <FormError message={error} />}

      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField label="Courriel" id="login-email" name="email" type="email" required autoComplete="email" />
        <TextField
          label="Mot de passe"
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
        <Button variant="primary" type="submit">
          {loading ? 'Connexion...' : 'Connexion'}
        </Button>
      </form>

      <p className={styles.signupHint}>
        Pas encore de compte ? <Link href="/inscription">Inscription</Link>
      </p>
    </Modal>
  )
}
