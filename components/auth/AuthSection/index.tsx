'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '../../ui/Button'
import LoginModal from '../LoginModal'
import styles from './AuthSection.module.css'

export default function AuthSection() {
  const [showLogin, setShowLogin] = useState(false)

  return (
    <div className={styles.section}>
      <Button variant="link" onClick={() => setShowLogin(true)}>
        Connexion
      </Button>
      <Link href="/inscription" className={styles.signupLink}>
        Inscription
      </Link>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}
