'use client'

import { useState } from 'react'
import Modal from '../../auth/Modal'
import Select from '../../ui/Select'
import TextArea from '../../ui/TextArea'
import TextField from '../../ui/TextField'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import { sendFeedback } from '../../../app/actions/send-feedback'
import styles from './FeedbackWidget.module.css'

type Status = 'idle' | 'sending' | 'success' | 'error'

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  function handleClose() {
    setIsOpen(false)
    setStatus('idle')
    setErrorMessage('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('pageUrl', window.location.href)

    const result = await sendFeedback(formData)

    if (result.success) {
      setStatus('success')
    } else {
      setStatus('error')
      setErrorMessage(result.error)
    }
  }

  return (
    <>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(true)}
        aria-label="Donner votre avis"
      >
        <span className={styles.triggerIcon}>💬</span>
        <span className={styles.triggerLabel}>Votre avis</span>
      </button>

      {isOpen && (
        <Modal onClose={handleClose}>
          {status === 'success' ? (
            <div className={styles.successMessage}>
              <div className={styles.successIcon}>✓</div>
              <p className={styles.successTitle}>Merci pour votre retour !</p>
              <p className={styles.successText}>
                Votre message a bien été envoyé. Nous le lirons avec attention.
              </p>
              <div className={styles.successActions}>
                <Button onClick={handleClose}>Fermer</Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className={styles.title}>Donnez-nous votre avis</h2>
              <form className={styles.form} onSubmit={handleSubmit}>
                <Select
                  label="Type"
                  id="feedback-type"
                  name="type"
                  defaultValue="suggestion"
                  options={[
                    { value: 'suggestion', label: 'Suggestion' },
                    { value: 'bug', label: 'Bug' },
                    { value: 'question', label: 'Question' },
                    { value: 'other', label: 'Autre' },
                  ]}
                />

                <TextArea
                  label="Message"
                  id="feedback-message"
                  name="message"
                  required
                  placeholder="Décrivez votre retour…"
                  rows={4}
                />

                <TextField
                  label="Email (optionnel)"
                  id="feedback-email"
                  name="email"
                  type="email"
                  placeholder="Pour qu'on puisse vous répondre"
                />

                {status === 'error' && <FormError message={errorMessage} />}

                <div className={styles.actions}>
                  <Button variant="secondary" onClick={handleClose}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={status === 'sending'}>
                    {status === 'sending' ? 'Envoi…' : 'Envoyer'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </Modal>
      )}
    </>
  )
}
