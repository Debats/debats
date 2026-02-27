'use client'

import { useState, type FormEvent } from 'react'
import { acceptInvitation } from './actions'
import TextField from '../../components/ui/TextField'
import Button from '../../components/ui/Button'
import FormError from '../../components/ui/FormError'
import styles from './AcceptInvitationForm.module.css'

interface AcceptInvitationFormProps {
  tokenHash: string
}

export default function AcceptInvitationForm({ tokenHash }: AcceptInvitationFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await acceptInvitation(tokenHash, formData)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    window.location.href = '/'
  }

  if (success) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Bienvenue !</h1>
        <p className={styles.text}>
          Votre compte a été créé. Vous allez être redirigé·e vers l&apos;accueil&hellip;
        </p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Bienvenue sur Débats.co</h1>
      <p className={styles.text}>
        Choisissez un mot de passe pour finaliser la création de votre compte.
      </p>

      {error && <FormError message={error} />}

      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField
          label="Mot de passe"
          id="accept-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
        />
        <TextField
          label="Confirmation du mot de passe"
          id="accept-password-confirmation"
          name="password_confirmation"
          type="password"
          required
          autoComplete="new-password"
        />
        <Button variant="primary" type="submit">
          {loading ? 'Création du compte...' : 'Créer mon compte'}
        </Button>
      </form>
    </div>
  )
}
