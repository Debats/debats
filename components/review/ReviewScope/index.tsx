'use client'

import { ReactNode } from 'react'
import { ReviewScopeContext, ReviewScopeValue } from '../review-scope'

interface ReviewScopeProps extends ReviewScopeValue {
  children: ReactNode
}

/**
 * Porte les marques de vérification qu'une page a lues en une fois, et qui
 * la regarde, jusqu'aux entités qu'elle affiche : aucun composant entre la
 * page et la marque n'a à les transporter.
 */
export default function ReviewScope({ marks, viewer, children }: ReviewScopeProps) {
  return <ReviewScopeContext value={{ marks, viewer }}>{children}</ReviewScopeContext>
}
