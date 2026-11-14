'use client'

import { useState } from 'react'
import { Chantier, ChantierMessage } from '../../../../domain/entities/chantier'
import { plural } from '../../../../lib/plural'
import { deliverChantierReviewsAction } from '../../../actions/deliver-chantier-reviews'
import ChantierPrompt from '../ChantierPrompt'

interface PendingReviewsProps {
  chantierId: string
  /** How many reviews are kept for the agent */
  waiting: number
  /** The agent heard them: the chantier as it now stands, and the notices now in its thread */
  onDelivered: (chantier: Chantier, messages: ChantierMessage[]) => void
}

/**
 * The reviews the agent of a chantier has not been told yet, and the way
 * to hand them over. A review alone does not wake the agent: it would read
 * everything it carries again for each one, and most ask nothing of it.
 */
export default function PendingReviews({ chantierId, waiting, onDelivered }: PendingReviewsProps) {
  const [delivering, setDelivering] = useState(false)
  const [refusal, setRefusal] = useState<string>()

  const deliver = async () => {
    setDelivering(true)
    setRefusal(undefined)
    const result = await deliverChantierReviewsAction(chantierId)
    if (result.delivered) {
      onDelivered(result.chantier, result.messages)
    } else {
      setRefusal(result.message)
    }
    setDelivering(false)
  }

  return (
    <ChantierPrompt
      label="Retours de relecture"
      actionLabel="Traiter les retours"
      pendingLabel="Transmission…"
      pending={delivering}
      refusal={refusal}
      onAct={() => void deliver()}
    >
      {waiting} {plural(waiting, 'retour attend', 'retours attendent')} l’agent. Il ne les lit que
      lorsque vous les lui transmettez, tous ensemble : il corrige alors ce qui est renvoyé en
      révision et tire la leçon des rejets.
    </ChantierPrompt>
  )
}
