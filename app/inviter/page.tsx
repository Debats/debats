import { redirect } from 'next/navigation'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { canPerform, requiredRank } from '../../domain/reputation/permissions'
import InviteForm from '../../components/invitations/InviteForm'

export const metadata = {
  title: 'Inviter — Débats.co',
}

export default async function InviterPage() {
  const contributor = await getAuthenticatedContributor()

  if (!contributor) {
    redirect('/?notice=' + encodeURIComponent('Vous devez être connecté·e pour inviter.'))
  }

  if (!canPerform(contributor.reputation, 'invite_user')) {
    const rank = requiredRank('invite_user')
    redirect('/?notice=' + encodeURIComponent(`Vous devez être ${rank} pour inviter.`))
  }

  return <InviteForm />
}
