import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authenticated = vi.hoisted(() => vi.fn())
const read = vi.hoisted(() => vi.fn())
const captured = vi.hoisted(() => vi.fn())

vi.mock('./get-authenticated-contributor', () => ({
  getAuthenticatedContributor: authenticated,
}))
vi.mock('../../infra/ai/proofreader', () => ({
  createProofreader: () => ({ read }),
}))
vi.mock('@sentry/nextjs', () => ({ captureException: captured }))

import { proofreadContribution } from './proofread-contribution'

const QUOTE = {
  field: 'quote',
  label: 'Citation',
  value: 'Je défends une hausse du salaire minimum.',
}

const POSITION = { label: 'Position choisie', value: 'Il faut augmenter le SMIC' }

beforeEach(() => {
  authenticated.mockResolvedValue({ id: 'abc', reputation: 100 })
  read.mockResolvedValue([{ field: 'quote', verdict: 'ok', note: 'Rien à signaler.' }])
})

afterEach(() => vi.clearAllMocks())

describe('proofreadContribution', () => {
  it('hands back the advice, field by field', async () => {
    await expect(proofreadContribution({ fields: [QUOTE], context: [POSITION] })).resolves.toEqual({
      read: true,
      advice: [{ field: 'quote', verdict: 'ok', note: 'Rien à signaler.' }],
    })
    expect(read).toHaveBeenCalledWith([QUOTE], [POSITION])
  })

  it('reads nothing at all for a visitor who is not signed in', async () => {
    authenticated.mockResolvedValue(null)

    await expect(proofreadContribution({ fields: [QUOTE], context: [] })).resolves.toEqual({
      read: false,
      message: expect.stringContaining('Reconnectez-vous'),
    })
    expect(read).not.toHaveBeenCalled()
  })

  /*
   * What reaches a Server Function has no type, and the reader walks the list
   * without questioning it. A field with no name has nowhere to put its
   * advice, and an empty one has nothing to say about.
   */
  it('asks about named, filled fields only', async () => {
    await proofreadContribution({
      fields: [
        QUOTE,
        { field: '', label: 'Sans nom', value: 'du texte' },
        { field: 'sourceName', label: 'Source', value: '   ' },
        { field: 'sourceUrl', label: 'Adresse', value: 42 },
        'pas un champ',
        null,
      ],
      context: [],
    })

    expect(read).toHaveBeenCalledWith([QUOTE], [])
  })

  it('keeps only the context that says something', async () => {
    await proofreadContribution({
      fields: [QUOTE],
      context: [POSITION, { label: 'Sujet choisi', value: '' }, { value: 'sans libellé' }, 3],
    })

    expect(read).toHaveBeenCalledWith([QUOTE], [POSITION])
  })

  it('asks nothing when nothing is worth asking about', async () => {
    await expect(proofreadContribution('n’importe quoi')).resolves.toEqual({
      read: true,
      advice: [],
    })
    expect(read).not.toHaveBeenCalled()
  })

  /*
   * The one promise that matters: the assist never stands between a
   * contributor and her contribution. A failure says so.
   */
  it('says the contribution can still be sent when the reading fails', async () => {
    read.mockRejectedValue(new Error('503'))

    await expect(proofreadContribution({ fields: [QUOTE], context: [] })).resolves.toEqual({
      read: false,
      message: expect.stringContaining('part quand vous voulez'),
    })
  })

  it('reports a failure without the contributor’s text', async () => {
    read.mockRejectedValue(new Error('503'))

    await proofreadContribution({ fields: [QUOTE], context: [POSITION] })

    expect(captured).toHaveBeenCalledTimes(1)
    const reported = JSON.stringify(captured.mock.calls[0])
    expect(reported).not.toContain('hausse du salaire minimum')
    expect(reported).not.toContain('augmenter le SMIC')
    expect(reported).toContain('proofreading')
  })
})
