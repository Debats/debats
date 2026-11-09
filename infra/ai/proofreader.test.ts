import { afterEach, describe, expect, it, vi } from 'vitest'

const create = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create }
  },
}))

import { createProofreader } from './proofreader'

const FIELDS = [
  { field: 'subjectTitle', label: 'Titre du sujet', value: 'L’augmentation du SMIC' },
  { field: 'quote', label: 'Citation', value: 'Il faut augmenter le SMIC.' },
]

const CHOSEN_POSITION = { label: 'Position choisie', value: 'Il faut augmenter le SMIC' }

/** What the API answers, in the shape the structured output asks for */
const answering = (advice: unknown) =>
  create.mockResolvedValue({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify({ advice }) }],
  })

afterEach(() => vi.clearAllMocks())

describe('createProofreader', () => {
  it('hands back the advice it was given', async () => {
    answering([
      { field: 'subjectTitle', verdict: 'problem', note: 'Le titre porte un avis.' },
      { field: 'quote', verdict: 'ok', note: 'Rien à signaler.' },
    ])

    await expect(createProofreader().read(FIELDS, [])).resolves.toEqual([
      { field: 'subjectTitle', verdict: 'problem', note: 'Le titre porte un avis.' },
      { field: 'quote', verdict: 'ok', note: 'Rien à signaler.' },
    ])
  })

  it('asks nobody when there is nothing to read', async () => {
    await expect(createProofreader().read([], [CHOSEN_POSITION])).resolves.toEqual([])
    expect(create).not.toHaveBeenCalled()
  })

  /*
   * What the contributor chose rather than typed — the subject, the position —
   * is what a quote is judged against, so the model must see it; but nobody
   * can fix it from this form, so it goes as context, apart from the fields.
   */
  it('hands over what was chosen apart from what was typed', async () => {
    answering([])

    await createProofreader().read(FIELDS, [CHOSEN_POSITION])

    const [sent] = create.mock.calls[0] as [{ messages: { content: string }[] }]
    expect(JSON.parse(sent.messages[0].content)).toEqual({
      context: [CHOSEN_POSITION],
      fields: FIELDS,
    })
  })

  /*
   * Effort is explicit because this model's default is `medium`, and thinking
   * is never configured because it cannot be turned off here — asking for
   * that is a 400. The rules go first and carry the cache breakpoint; the
   * fields, which change every time, come after them.
   */
  it('asks the one model, at low effort, with the rules cached ahead of the fields', async () => {
    answering([])

    await createProofreader().read(FIELDS, [])

    const [sent] = create.mock.calls[0] as [Record<string, unknown>]
    expect(sent.model).toBe('claude-opus-5-5')
    expect(sent.thinking).toBeUndefined()
    expect(sent.output_config).toMatchObject({ effort: 'low' })
    expect(sent.system).toEqual([expect.objectContaining({ cache_control: { type: 'ephemeral' } })])
  })

  it('tells the model exactly what it may answer', async () => {
    answering([])

    await createProofreader().read(FIELDS, [])

    const [sent] = create.mock.calls[0] as [{ output_config: { format: { schema: unknown } } }]
    expect(sent.output_config.format).toMatchObject({ type: 'json_schema' })
    expect(JSON.stringify(sent.output_config.format.schema)).toContain('"problem"')
  })

  /* Advice about a field nobody asked about has nowhere to go */
  it('drops advice about a field it was not given', async () => {
    answering([
      { field: 'quote', verdict: 'ok', note: 'Rien à signaler.' },
      { field: 'presentation', verdict: 'problem', note: 'Inventé de toutes pièces.' },
    ])

    await expect(createProofreader().read(FIELDS, [])).resolves.toEqual([
      { field: 'quote', verdict: 'ok', note: 'Rien à signaler.' },
    ])
  })

  it('fails rather than pass off an answer it cannot read', async () => {
    answering([{ field: 'quote', verdict: 'rouge', note: 'Mauvais verdict.' }])

    await expect(createProofreader().read(FIELDS, [])).rejects.toThrow('forme inattendue')
  })

  it('fails when the model answered no text at all', async () => {
    create.mockResolvedValue({ stop_reason: 'end_turn', content: [] })

    await expect(createProofreader().read(FIELDS, [])).rejects.toThrow('rien répondu')
  })

  /* A policy decline arrives as a 200 with its own stop reason, not as an error */
  it('fails on a refusal rather than read an empty answer', async () => {
    create.mockResolvedValue({
      stop_reason: 'refusal',
      stop_details: { category: 'general_harms' },
      content: [],
    })

    await expect(createProofreader().read(FIELDS, [])).rejects.toThrow('déclinée')
  })
})
