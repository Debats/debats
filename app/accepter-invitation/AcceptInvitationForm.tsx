'use client'

import { useState, type FormEvent } from 'react'
import { acceptInvitation, resendInvitationLink } from './actions'
import TextField from '../../components/ui/TextField'
import Button from '../../components/ui/Button'
import FormError from '../../components/ui/FormError'
import styles from './AcceptInvitationForm.module.css'

interface AcceptInvitationFormProps {
  tokenHash: string
  email?: string
}

export default function AcceptInvitationForm({ tokenHash, email }: AcceptInvitationFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [tokenExpired, setTokenExpired] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await acceptInvitation(tokenHash, formData)

    if (!result.success) {
      if (result.tokenExpired && email) {
        setTokenExpired(true)
      }
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    window.location.href = '/'
  }

  const handleResend = async () => {
    if (!email) return
    setError(null)
    setLoading(true)

    const result = await resendInvitationLink(email)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    setResendSuccess(true)
    setLoading(false)
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

  if (resendSuccess) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Nouveau lien envoyé</h1>
        <p className={styles.text}>
          Un nouveau lien d&apos;invitation vous a été envoyé à <strong>{email}</strong>. Vérifiez
          votre boîte de réception.
        </p>
      </div>
    )
  }

  if (tokenExpired) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Lien expiré</h1>
        <p className={styles.text}>
          Votre lien d&apos;invitation a expiré. Vous pouvez demander l&apos;envoi d&apos;un nouveau
          lien.
        </p>

        {error && <FormError message={error} />}

        <Button variant="primary" onClick={handleResend} disabled={loading}>
          {loading ? 'Envoi en cours…' : 'Renvoyer un nouveau lien'}
        </Button>
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
