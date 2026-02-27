'use client'

import { useState, type FormEvent } from 'react'
import { inviteUserAction } from '../../../app/actions/invite-user'
import TextField from '../../ui/TextField'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import styles from './InviteForm.module.css'

export default function InviteForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successEmail, setSuccessEmail] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await inviteUserAction(formData)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccessEmail(result.email)
    setLoading(false)
  }

  if (successEmail) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Invitation envoyée</h1>
        <p className={styles.successMessage}>
          Un courriel d&apos;invitation a été envoyé à{' '}
          <span className={styles.successEmail}>{successEmail}</span>. La personne recevra un lien
          pour créer son compte.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Inviter</h1>
      <p className={styles.subtitle}>Invitez une personne de confiance à rejoindre Débats.co.</p>

      {error && <FormError message={error} />}

      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField
          label="Nom"
          id="invite-name"
          name="name"
          type="text"
          required
          autoComplete="off"
        />
        <TextField
          label="Courriel"
          id="invite-email"
          name="email"
          type="email"
          required
          autoComplete="off"
        />
        <Button variant="primary" type="submit">
          {loading ? 'Envoi...' : "Envoyer l'invitation"}
        </Button>
      </form>
    </div>
  )
}
