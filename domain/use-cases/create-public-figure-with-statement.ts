import { Either } from 'effect'
import * as S from 'effect/Schema'
import { Effect } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import { createPublicFigure, PublicFigure } from '../entities/public-figure'
import { createStatement, createEvidence } from '../entities/statement'
import { PositionRepository } from '../repositories/position-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { WikipediaValidator } from '../services/wikipedia-validator'

const CreatePublicFigureWithStatementInput = S.Struct({
  name: S.String.pipe(S.minLength(2), S.maxLength(100)),
  presentation: S.String.pipe(S.minLength(10)),
  sourceName: S.String.pipe(S.minLength(1)),
  sourceUrl: S.optional(S.String),
  quote: S.String.pipe(S.minLength(10)),
  factDate: S.String.pipe(S.pattern(/^\d{4}-\d{2}-\d{2}$/)),
})

type Contributor = { id: string; reputation: number }

type CreatePublicFigureWithStatementParams = {
  contributor: Contributor | null
  name: string
  presentation: string
  wikipediaUrl: string
  websiteUrl: string
  notorietySources: string[]
  subjectId: string
  positionId: string
  sourceName: string
  sourceUrl: string
  quote: string
  factDate: string
  positionRepo: PositionRepository
  statementRepo: StatementRepository
  subjectRepo: SubjectRepository
  publicFigureRepo: PublicFigureRepository
  reputationRepo: ReputationRepository
  wikipediaValidator: WikipediaValidator
}

export type FieldErrors = Record<string, string>

export async function createPublicFigureWithStatementUseCase(
  params: CreatePublicFigureWithStatementParams,
): Promise<Either.Either<PublicFigure, string | FieldErrors>> {
  const {
    contributor,
    name,
    presentation,
    websiteUrl,
    notorietySources,
    subjectId,
    positionId,
    sourceName,
    sourceUrl,
    quote,
    factDate,
    positionRepo,
    statementRepo,
    subjectRepo,
    publicFigureRepo,
    reputationRepo,
    wikipediaValidator,
  } = params
  const wikipediaUrl = params.wikipediaUrl.trim()

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'add_personality')) {
    const rank = requiredRank('add_personality')
    return Either.left(`Vous devez être ${rank} pour proposer une nouvelle personnalité.`)
  }

  const decoded = S.decodeUnknownEither(CreatePublicFigureWithStatementInput, { errors: 'all' })({
    name,
    presentation,
    sourceName,
    sourceUrl: sourceUrl || undefined,
    quote,
    factDate,
  })

  const fieldErrors: FieldErrors = {}

  if (Either.isLeft(decoded)) {
    const issues = ArrayFormatter.formatErrorSync(decoded.left)
    for (const issue of issues) {
      const field = issue.path.join('.')
      if (field === 'name') {
        fieldErrors.name = 'Le nom doit faire entre 2 et 100 caractères.'
      } else if (field === 'presentation') {
        fieldErrors.presentation = 'La présentation doit faire au moins 10 caractères.'
      } else if (field === 'sourceName') {
        fieldErrors.sourceName = 'Le nom de la source est requis.'
      } else if (field === 'quote') {
        fieldErrors.quote = 'La citation doit faire au moins 10 caractères.'
      } else if (field === 'factDate') {
        fieldErrors.factDate = 'La date du fait est invalide (format attendu : AAAA-MM-JJ).'
      }
    }
  }

  if (wikipediaUrl) {
    if (!/^https:\/\/(fr|en)\.wikipedia\.org\/wiki\/.+/.test(wikipediaUrl)) {
      fieldErrors.wikipediaUrl =
        'L\u2019URL Wikipedia est invalide (format attendu : https://fr.wikipedia.org/wiki/...).'
    }
  } else {
    const urlPattern = /^https?:\/\/.+/
    if (notorietySources.length < 2 || !notorietySources.every((url) => urlPattern.test(url))) {
      fieldErrors.notorietySources =
        'Sans page Wikipedia, au moins 2 sources de notoriété (URLs valides) sont requises.'
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return Either.left(fieldErrors)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const parsedDate = new Date(factDate)
  if (parsedDate > today) {
    return Either.left({ factDate: 'La date du fait ne peut pas être dans le future.' })
  }

  if (wikipediaUrl) {
    const wikiResult = await wikipediaValidator.validatePage(wikipediaUrl)
    if (!wikiResult.exists) {
      return Either.left({
        wikipediaUrl: 'La page Wikipedia n\u2019existe pas.',
      })
    }
    if (!wikiResult.isBiography) {
      return Either.left({
        wikipediaUrl: 'La page Wikipedia ne correspond pas à une biographie.',
      })
    }
  }

  const subject = await Effect.runPromise(subjectRepo.findById(subjectId))
  if (!subject) {
    return Either.left('Le sujet sélectionné est introuvable.')
  }

  const position = await Effect.runPromise(positionRepo.findById(positionId))
  if (!position) {
    return Either.left('La position sélectionnée est introuvable.')
  }

  if (position.subjectId !== subjectId) {
    return Either.left('La position sélectionnée n\u2019appartient pas à ce sujet.')
  }

  const publicFigure = createPublicFigure({
    name,
    presentation,
    wikipediaUrl,
    websiteUrl: websiteUrl || undefined,
    createdBy: contributor.id,
  })

  const createdFigure = await Effect.runPromise(publicFigureRepo.create(publicFigure))

  const statement = createStatement({
    publicFigureId: createdFigure.id,
    positionId,
    createdBy: contributor.id,
  })

  await Effect.runPromise(statementRepo.create(statement))

  const evidence = createEvidence({
    statementId: statement.id,
    sourceName,
    sourceUrl: sourceUrl || undefined,
    quote,
    factDate: new Date(factDate),
    createdBy: contributor.id,
  })

  await Effect.runPromise(statementRepo.createEvidence(evidence))

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'added_personality_validated',
      amount: reputationReward('added_personality_validated'),
      relatedEntityType: 'public_figure',
      relatedEntityId: createdFigure.id,
    }),
  )
  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'added_statement_validated',
      amount: reputationReward('added_statement_validated'),
      relatedEntityType: 'statement',
      relatedEntityId: statement.id,
    }),
  )

  return Either.right(createdFigure)
}
