'use client'

import { useState, type FormEvent } from 'react'
import { signup } from './actions'
import TextField from '../../../components/ui/TextField'
import Button from '../../../components/ui/Button'
import FormError from '../../../components/ui/FormError'
import styles from './SignupForm.module.css'

interface SignupFormProps {
  token: string
}

export default function SignupForm({ token }: SignupFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await signup(token, formData)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Vérifiez votre courriel</h1>
        <p className={styles.text}>
          Un lien de confirmation vous a été envoyé. Cliquez dessus pour activer votre compte.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Inscription</h1>

      {error && <FormError message={error} />}

      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField label="Nom" id="signup-name" name="name" type="text" required autoComplete="name" />
        <TextField label="Courriel" id="signup-email" name="email" type="email" required autoComplete="email" />
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
    </div>
  )
}
