'use client'

import { useState, type FormEvent } from 'react'
import { createBrowserSupabaseClient } from '../../../infra/supabase/browser'
import Modal from '../Modal'
import TextField from '../../ui/TextField'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import SwitchLink from '../../ui/SwitchLink'
import styles from './SignupModal.module.css'

interface SignupModalProps {
  onClose: () => void
  onSwitchToLogin: () => void
}

export default function SignupModal({ onClose, onSwitchToLogin }: SignupModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const passwordConfirmation = formData.get('password_confirmation') as string

    if (password !== passwordConfirmation) {
      setError('Les mots de passe ne correspondent pas.')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      setLoading(false)
      return
    }

    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <Modal onClose={onClose}>
        <h2 className={styles.title}>Vérifiez votre courriel</h2>
        <p className={styles.successText}>
          Un lien de confirmation vous a été envoyé. Cliquez dessus pour activer votre compte.
        </p>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose}>
      <h2 className={styles.title}>Inscription</h2>

      {error && <FormError message={error} />}

      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField
          label="Nom"
          id="signup-name"
          name="name"
          type="text"
          required
          autoComplete="name"
        />
        <TextField
          label="Courriel"
          id="signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
        <TextField
          label="Mot de passe"
          id="signup-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
        />
        <TextField
          label="Confirmation du mot de passe"
          id="signup-password-confirmation"
          name="password_confirmation"
          type="password"
          required
          autoComplete="new-password"
        />
        <Button variant="primary" type="submit">
          {loading ? 'Inscription...' : 'Inscription'}
        </Button>
      </form>

      <SwitchLink text="Déjà un compte ?" linkLabel="Connexion" onClick={onSwitchToLogin} />
    </Modal>
  )
}
