import { redirect } from 'next/navigation'
import SignupForm from './SignupForm'

export const metadata = {
  title: 'Inscription',
  description: 'Créez votre compte Débats.co',
}

export default async function SecretSignupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const expectedToken = process.env.SIGNUP_SECRET_TOKEN

  if (!expectedToken || token !== expectedToken) {
    redirect('/inscription')
  }

  return <SignupForm />
}
