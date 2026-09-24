'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { removeOrganisationMembershipAction } from '../../../app/actions/remove-organisation-membership'
import ConfirmAction from '../../ui/ConfirmAction'

interface RemoveMembershipButtonProps {
  membershipId: string
  organisationSlug: string
  figureName: string
}

/** Retire une affiliation erronée, après confirmation. */
export default function RemoveMembershipButton({
  membershipId,
  organisationSlug,
  figureName,
}: RemoveMembershipButtonProps) {
  const router = useRouter()

  const handleConfirm = useCallback(async () => {
    const result = await removeOrganisationMembershipAction(membershipId, organisationSlug)
    if (!result.success) throw new Error(result.error)
    router.refresh()
  }, [membershipId, organisationSlug, router])

  return (
    <ConfirmAction
      triggerLabel="Retirer"
      warning={`Retirer l’affiliation de ${figureName} ? Pour une affiliation terminée, préférez indiquer une date de fin.`}
      confirmLabel="Retirer"
      pendingLabel="Retrait…"
      onConfirm={handleConfirm}
    />
  )
}
