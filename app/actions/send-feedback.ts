'use server'

import * as Sentry from '@sentry/nextjs'
import { sendEmail } from '../../infra/email'

const FEEDBACK_TYPES: Record<string, string> = {
  bug: 'Bug',
  suggestion: 'Suggestion',
  question: 'Question',
  other: 'Autre',
}

export type FeedbackResult = { success: true } | { success: false; error: string }

export async function sendFeedback(formData: FormData): Promise<FeedbackResult> {
  const type = formData.get('type') as string
  const message = (formData.get('message') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const pageUrl = formData.get('pageUrl') as string

  if (!message) {
    return { success: false, error: 'Le message est requis.' }
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "L'adresse email n'est pas valide." }
  }

  const typeLabel = FEEDBACK_TYPES[type] || type
  const subject = `[Débats.co] Feedback : ${typeLabel}`

  const lines = [
    `Type : ${typeLabel}`,
    `Page : ${pageUrl || 'Non renseignée'}`,
    email ? `Email : ${email}` : 'Email : Non renseigné',
    '',
    'Message :',
    message,
  ]

  try {
    await sendEmail({
      to: 'contact@debats.co',
      subject,
      text: lines.join('\n'),
      replyTo: email || undefined,
    })
    return { success: true }
  } catch (error) {
    Sentry.captureException(error)
    return { success: false, error: "L'envoi du feedback a échoué. Veuillez réessayer." }
  }
}
