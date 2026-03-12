import AcceptInvitationForm from './AcceptInvitationForm'

export const metadata = {
  title: 'Accepter une invitation',
  description: 'Acceptez votre invitation et créez votre compte Débats.co',
}

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; email?: string }>
}) {
  const { token_hash, type, email } = await searchParams

  if (!token_hash || type !== 'invite') {
    return (
      <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px' }}>
        <h1>Lien invalide</h1>
        <p>Ce lien d&apos;invitation est invalide ou incomplet.</p>
      </div>
    )
  }

  return <AcceptInvitationForm tokenHash={token_hash} email={email} />
}
