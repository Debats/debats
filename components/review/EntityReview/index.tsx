'use client'

import { use } from 'react'
import { ReviewedEntity } from '../../../domain/aggregates/review'
import { markOf } from '../../../domain/read-models/review'
import ReviewMark from '../ReviewMark'
import { ReviewScopeContext } from '../review-scope'

interface EntityReviewProps {
  entity: ReviewedEntity
}

/**
 * La marque de vérification d'une entité, telle que la page l'a lue. Hors
 * d'un `ReviewScope` (une page qui n'a pas lu de marques), rien n'est rendu.
 */
export default function EntityReview({ entity }: EntityReviewProps) {
  const scope = use(ReviewScopeContext)
  if (!scope) return null
  const mark = markOf(scope.marks, entity.id)
  // The mark keeps what the viewer's own words made of it; when the page reads it
  // anew (she signed in, someone else confirmed), it starts again from what was read
  const asRead = [entity.id, scope.viewer, ...Object.values(mark)].join(':')
  return <ReviewMark key={asRead} entity={entity} mark={mark} viewer={scope.viewer} />
}
