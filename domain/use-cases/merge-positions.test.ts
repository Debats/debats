import { describe, it, expect, vi } from 'vitest'
import { Effect, Either } from 'effect'
import { mergePositions } from './merge-positions'
import { PositionRepository } from '../repositories/position-repository'
import { Position, PositionId, PositionTitle } from '../entities/position'

function makePosition(id: string, subjectId: string, title: string): Position {
  return Position.make({
    id: PositionId.make(id),
    title: PositionTitle.make(title),
    description: 'Description test.',
    subjectId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

function makeRepos(overrides: { source?: Position | null; target?: Position | null }) {
  const positionRepo = {
    findById: vi.fn((id: string) => {
      if (id === 'source-id') return Effect.succeed(overrides.source ?? null)
      if (id === 'target-id') return Effect.succeed(overrides.target ?? null)
      return Effect.succeed(null)
    }),
    mergeInto: vi.fn(() => Effect.succeed(undefined)),
  } as unknown as PositionRepository & {
    findById: ReturnType<typeof vi.fn>
    mergeInto: ReturnType<typeof vi.fn>
  }

  return { positionRepo }
}

describe('mergePositions', () => {
  it('should fail if source and target are the same', async () => {
    const { positionRepo } = makeRepos({})
    const result = await mergePositions({
      sourcePositionId: 'source-id',
      targetPositionId: 'source-id',
      contributor: { id: 'user-1', reputation: 1_000_000 },
      positionRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) expect(result.left).toContain('identiques')
  })

  it('should fail if contributor lacks admin permission', async () => {
    const { positionRepo } = makeRepos({
      source: makePosition('source-id', 'sub-1', 'Position source'),
      target: makePosition('target-id', 'sub-1', 'Position cible'),
    })
    const result = await mergePositions({
      sourcePositionId: 'source-id',
      targetPositionId: 'target-id',
      contributor: { id: 'user-1', reputation: 100 },
      positionRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) expect(result.left).toContain('Fondateur')
  })

  it('should fail if source position not found', async () => {
    const { positionRepo } = makeRepos({
      source: null,
      target: makePosition('target-id', 'sub-1', 'Position cible'),
    })
    const result = await mergePositions({
      sourcePositionId: 'source-id',
      targetPositionId: 'target-id',
      contributor: { id: 'user-1', reputation: 1_000_000 },
      positionRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) expect(result.left).toContain('source')
  })

  it('should fail if positions belong to different subjects', async () => {
    const { positionRepo } = makeRepos({
      source: makePosition('source-id', 'sub-1', 'Position source'),
      target: makePosition('target-id', 'sub-2', 'Position cible'),
    })
    const result = await mergePositions({
      sourcePositionId: 'source-id',
      targetPositionId: 'target-id',
      contributor: { id: 'user-1', reputation: 1_000_000 },
      positionRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) expect(result.left).toContain('même sujet')
  })

  it('should call mergeInto and succeed', async () => {
    const { positionRepo } = makeRepos({
      source: makePosition('source-id', 'sub-1', 'Position source'),
      target: makePosition('target-id', 'sub-1', 'Position cible'),
    })
    const result = await mergePositions({
      sourcePositionId: 'source-id',
      targetPositionId: 'target-id',
      contributor: { id: 'user-1', reputation: 1_000_000 },
      positionRepo,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(positionRepo.mergeInto).toHaveBeenCalledWith('source-id', 'target-id')
  })
})
