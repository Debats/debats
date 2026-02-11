'use client'

import { useState, type FormEvent } from 'react'
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('Identifiants incorrects.')
  }

  return (
    <Modal onClose={onClose}>
      <h2 className={styles.title}>Connexion</h2>

      {error && <FormError message={error} />}

      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField label="Courriel" id="login-email" type="email" required autoComplete="email" />
        <TextField
          label="Mot de passe"
          id="login-password"
          type="password"
          required
          autoComplete="current-password"
        />
        <Button variant="primary" type="submit">
          Connexion
        </Button>
      </form>
    </Modal>
  )
}
