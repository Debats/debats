import { afterEach, describe, expect, it, vi } from 'vitest'
import { RevisionRequest } from '../../domain/services/draft-revision'

const create = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create }
  },
}))

import { createDraftReviser } from './draft-reviser'

const REQUEST: RevisionRequest = {
  fields: [
    { field: 'subjectTitle', label: 'Titre du sujet', value: 'L’augmentation du SMIC' },
    { field: 'quote', label: 'Citation', value: 'Il faut augmenter le SMIC.' },
  ],
  locked: [],
  catalogue: {
    author: { kind: 'public_figure', found: true },
    subject: { found: false },
    similarSubjects: [{ id: 's1', title: 'Le montant du SMIC' }],
    positions: [],
  },
  source: { host: 'lemonde.fr', verdict: { kind: 'verified' } },
  history: [{ role: 'user', text: 'Relis.' }],
  request: 'Neutralise le titre.',
}

const ANSWER = {
  reply: 'Le titre portait un avis : je l’ai ramené au thème.',
  advice: [{ field: 'subjectTitle', verdict: 'problem', note: 'Le titre porte un avis.' }],
  changes: [{ field: 'subjectTitle', value: 'Le montant du SMIC' }],
  choices: [
    { label: 'Rattacher au sujet existant', changes: [{ field: 'existingSubject', value: 's1' }] },
  ],
  suggestions: ['Raccourcis la présentation du sujet'],
}

const answering = (answer: unknown) =>
  create.mockResolvedValue({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify(answer) }],
  })

afterEach(() => vi.clearAllMocks())

describe('createDraftReviser', () => {
  it('hands back the revision it was given', async () => {
    answering(ANSWER)

    await expect(createDraftReviser().revise(REQUEST)).resolves.toEqual(ANSWER)
  })

  /* The form as it stands, what the site knows, what the source gave, the turns before: all of it, every turn */
  it('hands the whole request over, as one message after the cached rules', async () => {
    answering(ANSWER)

    await createDraftReviser().revise(REQUEST)

    const [sent] = create.mock.calls[0] as [
      {
        model: string
        output_config: { effort: string }
        system: unknown[]
        messages: { content: string }[]
      },
    ]
    expect(sent.model).toBe('claude-opus-5-5')
    expect(sent.output_config).toMatchObject({ effort: 'low' })
    expect(sent.system).toEqual([expect.objectContaining({ cache_control: { type: 'ephemeral' } })])
    expect(JSON.parse(sent.messages[0].content)).toEqual(REQUEST)
  })

  it('keeps only what is admissible', async () => {
    answering({
      ...ANSWER,
      changes: [{ field: 'positionTitle', value: 'Pas donné.' }],
      choices: [{ label: 'Inventé', changes: [{ field: 'existingPosition', value: 'nope' }] }],
    })

    const revision = await createDraftReviser().revise(REQUEST)

    expect(revision.changes).toEqual([])
    expect(revision.choices).toEqual([])
  })

  it('fails rather than pass off an answer it cannot read', async () => {
    answering({ ...ANSWER, changes: [{ field: 'nope', value: 'x' }] })

    await expect(createDraftReviser().revise(REQUEST)).rejects.toThrow('forme inattendue')
  })

  it('fails on a refusal rather than read an empty answer', async () => {
    create.mockResolvedValue({
      stop_reason: 'refusal',
      stop_details: { category: 'general_harms' },
      content: [],
    })

    await expect(createDraftReviser().revise(REQUEST)).rejects.toThrow('déclinée')
  })
})
