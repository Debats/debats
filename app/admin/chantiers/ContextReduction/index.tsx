'use client'

import { useState } from 'react'
import { Chantier } from '../../../../domain/entities/chantier'
import { plural } from '../../../../lib/plural'
import { reduceChantierContextAction } from '../../../actions/reduce-chantier-context'
import ChantierPrompt from '../ChantierPrompt'

interface ContextReductionProps {
  chantierId: string
  /** How many tokens the agent carries */
  contextTokens: number
  /** How many pages the notebook of the chantier holds: what the agent keeps of its reading */
  sourcesNoted: number
  /** Whether the agent is at work: what it is doing would be lost, so it is left to finish */
  working: boolean
  /** The agent carries on in a new session: the chantier as it now stands */
  onReduced: (chantier: Chantier) => void
}

const THOUSANDS = new Intl.NumberFormat('fr-FR')

/** A count of tokens to the nearest thousand: « 412 000 » */
const roundedTokens = (tokens: number) => THOUSANDS.format(Math.round(tokens / 1000) * 1000)

/**
 * What the agent of a chantier carries once it has grown, and the way to
 * bring it back down: the agent carries on in a new session, told what the
 * conversation said so far.
 */
export default function ContextReduction({
  chantierId,
  contextTokens,
  sourcesNoted,
  working,
  onReduced,
}: ContextReductionProps) {
  const [reducing, setReducing] = useState(false)
  const [refusal, setRefusal] = useState<string>()

  const reduce = async () => {
    setReducing(true)
    setRefusal(undefined)
    const result = await reduceChantierContextAction(chantierId)
    if (result.reduced) {
      onReduced(result.chantier)
    } else {
      setRefusal(result.message)
    }
    setReducing(false)
  }

  return (
    <ChantierPrompt
      label="Contexte de l’agent"
      actionLabel="Réduire le contexte"
      pendingLabel="Un instant…"
      pending={reducing}
      hint={working ? 'L’agent travaille : attendez qu’il ait fini.' : undefined}
      refusal={refusal}
      onAct={() => void reduce()}
    >
      L’agent porte environ {roundedTokens(contextTokens)} jetons, qu’il relit à chaque étape :
      c’est ce qui coûte. Réduire le contexte le fait repartir dans une session neuve, avec la
      conversation, les brouillons et son carnet de sources, sans les pages et les fichiers qu’il
      avait accumulés.{' '}
      {sourcesNoted > 0
        ? `Son carnet compte ${sourcesNoted} ${plural(sourcesNoted, 'adresse', 'adresses')}.`
        : 'Son carnet de sources est vide : demandez-lui d’abord d’y noter les pages utiles, sinon il devra les retrouver.'}
    </ChantierPrompt>
  )
}
