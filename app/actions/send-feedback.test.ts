import { describe, it, expect, vi } from 'vitest'

vi.mock('../../infra/email', () => ({
  sendEmail: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

import { sendFeedback } from './send-feedback'
import { sendEmail } from '../../infra/email'

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value)
  }
  return fd
}

describe('sendFeedback', () => {
  it('returns error when message is empty', async () => {
    const result = await sendFeedback(makeFormData({ type: 'bug', message: '' }))

    expect(result).toEqual({ success: false, error: 'Le message est requis.' })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('returns error when message is only whitespace', async () => {
    const result = await sendFeedback(makeFormData({ type: 'bug', message: '   ' }))

    expect(result).toEqual({ success: false, error: 'Le message est requis.' })
  })

  it('returns error when email is invalid', async () => {
    const result = await sendFeedback(
      makeFormData({ type: 'bug', message: 'Un bug', email: 'pas-un-email' }),
    )

    expect(result).toEqual({ success: false, error: "L'adresse email n'est pas valide." })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('sends email with correct content', async () => {
    vi.mocked(sendEmail).mockResolvedValue(undefined)

    const result = await sendFeedback(
      makeFormData({
        type: 'bug',
        message: 'Le bouton ne marche pas',
        email: 'user@example.com',
        pageUrl: 'https://debats.co/s/nucleaire',
      }),
    )

    expect(result).toEqual({ success: true })
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'contact@debats.co',
      subject: '[Débats.co] Feedback : Bug',
      text: [
        'Type : Bug',
        'Page : https://debats.co/s/nucleaire',
        'Email : user@example.com',
        '',
        'Message :',
        'Le bouton ne marche pas',
      ].join('\n'),
      replyTo: 'user@example.com',
    })
  })

  it('sends email without replyTo when no email provided', async () => {
    vi.mocked(sendEmail).mockResolvedValue(undefined)

    await sendFeedback(makeFormData({ type: 'suggestion', message: 'Super site' }))

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ replyTo: undefined }))
  })

  it('falls back to type value when type is unknown', async () => {
    vi.mocked(sendEmail).mockResolvedValue(undefined)

    await sendFeedback(makeFormData({ type: 'custom', message: 'Test' }))

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: '[Débats.co] Feedback : custom' }),
    )
  })

  it('returns error when sendEmail throws', async () => {
    vi.mocked(sendEmail).mockRejectedValue(new Error('SMTP down'))

    const result = await sendFeedback(makeFormData({ type: 'bug', message: 'Un problème' }))

    expect(result).toEqual({
      success: false,
      error: "L'envoi du feedback a échoué. Veuillez réessayer.",
    })
  })
})
