'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import styles from './NoticeBanner.module.css'

export default function NoticeBanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const notice = searchParams.get('notice')

  if (!notice) return null

  const dismiss = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('notice')
    const remaining = params.toString()
    router.replace(remaining ? `?${remaining}` : window.location.pathname)
  }

  return (
    <div className={styles.banner} role="alert">
      <p className={styles.message}>{notice}</p>
      <button className={styles.dismiss} onClick={dismiss} aria-label="Fermer">
        &times;
      </button>
    </div>
  )
}
