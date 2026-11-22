import { describe, expect, it } from 'vitest'
import { sampleJointDeclaration } from '../use-cases/joint-declaration-test-helpers'
import { attachmentPlanOf, AuthoredStatement, suggestedAttachments } from './attachment-plan'
import { JointDeclarationPage } from './joint-declaration'

const declaration = sampleJointDeclaration()

const stance = (key: string) => ({
  subject: { id: `subject-${key}`, title: `Sujet ${key}`, slug: key, problem: '' },
  position: { id: `pos-${key}`, title: `Position ${key}`, slug: key },
  quote: `Les mots du texte sur ${key}.`,
})

const text: JointDeclarationPage = {
  declaration,
  stances: [stance('media'), stance('ai'), stance('tax')],
  signatories: [],
}

const authored = (id: string, key: string, more: Partial<AuthoredStatement> = {}) => ({
  id,
  positionId: `pos-${key}`,
  summary: 'Coautrice du Manifeste de Paris',
  sourceName: 'Seuil',
  sourceUrl: 'https://seuil.com/manifeste',
  statedAt: new Date('2026-11-20'),
  jointDeclarationId: null,
  ...more,
})

const onMedia = {
  id: 'deed-media',
  positionId: 'pos-media',
  subjectId: 'subject-media',
  sourceUrl: 'https://www.seuil.com/manifeste/',
}

describe('attachmentPlanOf', () => {
  it('runs over every position of the text: the statement becomes the signature on its own, the others are made', () => {
    const plan = attachmentPlanOf(text, onMedia, [authored('deed-media', 'media')])

    expect(plan.refusal).toBeUndefined()
    expect(plan.declaration).toMatchObject({ id: declaration.id, declaredAt: '2026-11-21' })
    expect(plan.stances.map((s) => [s.positionId, s.kind])).toEqual([
      ['pos-media', 'attached'],
      ['pos-ai', 'open'],
      ['pos-tax', 'open'],
    ])
    expect(plan.stances[0]).toMatchObject({
      replaces: false,
      quote: 'Les mots du texte sur media.',
    })
  })

  it('offers the other statements of the author on the positions of the text, and suggests those from the same source', () => {
    const plan = attachmentPlanOf(text, onMedia, [
      authored('deed-media', 'media'),
      authored('deed-ai', 'ai'),
      authored('interview-ai', 'ai', {
        summary: 'Il faut déprivatiser',
        sourceName: 'France Inter',
        sourceUrl: 'https://franceinter.fr/interview',
      }),
    ])

    const onAi = plan.stances[1]
    expect(onAi.kind === 'open' && onAi.candidates).toEqual([
      {
        id: 'deed-ai',
        summary: 'Coautrice du Manifeste de Paris',
        sourceName: 'Seuil',
        statedAt: '2026-11-20',
        suggested: true,
      },
      {
        id: 'interview-ai',
        summary: 'Il faut déprivatiser',
        sourceName: 'France Inter',
        statedAt: '2026-11-20',
        suggested: false,
      },
    ])
    expect(suggestedAttachments(plan)).toEqual({ 'pos-ai': 'deed-ai' })
  })

  it('leaves alone a position an earlier signature of the author holds, and says when the statement takes the place of one', () => {
    const plan = attachmentPlanOf(text, onMedia, [
      authored('deed-media', 'media'),
      authored('signed-media', 'media', { jointDeclarationId: declaration.id }),
      authored('signed-ai', 'ai', { jointDeclarationId: declaration.id }),
      // The signature of another text is not this one's
      authored('other-text-tax', 'tax', { jointDeclarationId: 'another-declaration' }),
    ])

    expect(plan.stances.map((s) => s.kind)).toEqual(['attached', 'signed', 'open'])
    expect(plan.stances[0]).toMatchObject({ replaces: true })
    // A signature of another text cannot be attached to this one
    expect(plan.stances[2]).toMatchObject({ candidates: [] })
  })

  it('refuses a statement on a subject the text is silent on', () => {
    const elsewhere = { ...onMedia, positionId: 'pos-school', subjectId: 'subject-school' }
    expect(attachmentPlanOf(text, elsewhere, []).refusal).toBe('silent')
  })

  it('refuses a statement for another position than the one the text takes on its subject', () => {
    const against = { ...onMedia, positionId: 'pos-media-against' }
    expect(attachmentPlanOf(text, against, []).refusal).toBe('other_position')
  })
})
