'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import styles from './AuthErrorBanner.module.css'

export default function AuthErrorBanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const authError = searchParams.get('auth_error')

  if (!authError) return null

  const dismiss = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('auth_error')
    const remaining = params.toString()
    router.replace(remaining ? `?${remaining}` : window.location.pathname)
  }

  return (
    <div className={styles.banner} role="alert">
      <p className={styles.message}>{authError}</p>
      <button className={styles.dismiss} onClick={dismiss} aria-label="Fermer">
        &times;
      </button>
    </div>
  )
}
