import { Either } from 'effect'
import * as S from 'effect/Schema'
import { Effect } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import { format, isFuture, parseISO } from 'date-fns'
import { createPublicFigure, PublicFigure } from '../entities/public-figure'
import { createSubject, Subject } from '../entities/subject'
import { createPosition, Position } from '../entities/position'
import { createStatement, createEvidence } from '../entities/statement'
import { PositionRepository } from '../repositories/position-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { WikipediaValidator } from '../services/wikipedia-validator'

const EvidenceInput = S.Struct({
  sourceName: S.String.pipe(S.minLength(1)),
  sourceUrl: S.optional(S.String),
  quote: S.String.pipe(S.minLength(10)),
  factDate: S.String.pipe(S.pattern(/^\d{4}-\d{2}-\d{2}$/)),
})

const NewPublicFigureInput = S.Struct({
  name: S.String.pipe(S.minLength(2), S.maxLength(100)),
  presentation: S.String.pipe(S.minLength(10)),
  wikipediaUrl: S.String.pipe(S.pattern(/^https:\/\/(fr|en)\.wikipedia\.org\/wiki\/.+/)),
})

const NewSubjectInput = S.Struct({
  title: S.String.pipe(S.minLength(3), S.maxLength(100)),
  presentation: S.String.pipe(S.minLength(10)),
  problem: S.String.pipe(S.minLength(10)),
})

const NewPositionInput = S.Struct({
  title: S.String.pipe(S.minLength(3), S.maxLength(255)),
  description: S.String.pipe(S.minLength(10)),
})

type Contributor = { id: string; reputation: number }

type ContributeStatementParams = {
  contributor: Contributor | null

  // Public figure: existing ID OR new
  publicFigureId?: string
  newPublicFigure?: { name: string; presentation: string; wikipediaUrl: string; websiteUrl: string }

  // Subject: existing ID OR new
  subjectId?: string
  newSubject?: { title: string; presentation: string; problem: string }

  // Position: existing ID OR new
  positionId?: string
  newPosition?: { title: string; description: string }

  // Evidence (always required)
  sourceName: string
  sourceUrl: string
  quote: string
  factDate: string

  // Repositories
  subjectRepo: SubjectRepository
  positionRepo: PositionRepository
  statementRepo: StatementRepository
  publicFigureRepo: PublicFigureRepository
  reputationRepo: ReputationRepository
  wikipediaValidator: WikipediaValidator
}

export type FieldErrors = Record<string, string>

type ContributeStatementResult = {
  subjectSlug: string
  publicFigureSlug?: string
}

export async function contributeStatementUseCase(
  params: ContributeStatementParams,
): Promise<Either.Either<ContributeStatementResult, string | FieldErrors>> {
  const {
    contributor,
    publicFigureId,
    newPublicFigure,
    subjectId,
    newSubject,
    positionId,
    newPosition,
    sourceName,
    sourceUrl,
    quote,
    factDate,
    subjectRepo,
    positionRepo,
    statementRepo,
    publicFigureRepo,
    reputationRepo,
    wikipediaValidator,
  } = params

  // 1. Auth check
  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  // 2. Permission checks
  if (!canPerform(contributor.reputation, 'add_statement')) {
    const rank = requiredRank('add_statement')
    return Either.left(`Vous devez être ${rank} pour ajouter une prise de position.`)
  }

  if (newPublicFigure && !canPerform(contributor.reputation, 'add_personality')) {
    const rank = requiredRank('add_personality')
    return Either.left(`Vous devez être ${rank} pour proposer une nouvelle personnalité.`)
  }

  if (newSubject && !canPerform(contributor.reputation, 'add_subject')) {
    const rank = requiredRank('add_subject')
    return Either.left(`Vous devez être ${rank} pour créer un nouveau sujet.`)
  }

  if (newPosition && !canPerform(contributor.reputation, 'add_position')) {
    const rank = requiredRank('add_position')
    return Either.left(`Vous devez être ${rank} pour proposer une nouvelle position.`)
  }

  // 3. Validate evidence fields
  const fieldErrors: FieldErrors = {}

  const decodedEvidence = S.decodeUnknownEither(EvidenceInput, { errors: 'all' })({
    sourceName,
    sourceUrl: sourceUrl || undefined,
    quote,
    factDate,
  })

  if (Either.isLeft(decodedEvidence)) {
    const issues = ArrayFormatter.formatErrorSync(decodedEvidence.left)
    for (const issue of issues) {
      const field = issue.path.join('.')
      if (field === 'sourceName') {
        fieldErrors.sourceName = 'Le nom de la source est requis.'
      } else if (field === 'quote') {
        fieldErrors.quote = 'La citation doit faire au moins 10 caractères.'
      } else if (field === 'factDate') {
        fieldErrors.factDate = 'La date du fait est invalide (format attendu : AAAA-MM-JJ).'
      }
    }
  }

  // 4. Validate new entity fields if provided
  if (newPublicFigure) {
    const decoded = S.decodeUnknownEither(NewPublicFigureInput, { errors: 'all' })({
      name: newPublicFigure.name,
      presentation: newPublicFigure.presentation,
      wikipediaUrl: newPublicFigure.wikipediaUrl,
    })
    if (Either.isLeft(decoded)) {
      const issues = ArrayFormatter.formatErrorSync(decoded.left)
      for (const issue of issues) {
        const field = issue.path.join('.')
        if (field === 'name') {
          fieldErrors['newPublicFigure.name'] = 'Le nom doit faire entre 2 et 100 caractères.'
        } else if (field === 'presentation') {
          fieldErrors['newPublicFigure.presentation'] =
            'La présentation doit faire au moins 10 caractères.'
        } else if (field === 'wikipediaUrl') {
          fieldErrors['newPublicFigure.wikipediaUrl'] =
            'L\u2019URL Wikipedia est invalide (format attendu : https://fr.wikipedia.org/wiki/...).'
        }
      }
    }
  }

  if (newSubject) {
    const decoded = S.decodeUnknownEither(NewSubjectInput, { errors: 'all' })({
      title: newSubject.title,
      presentation: newSubject.presentation,
      problem: newSubject.problem,
    })
    if (Either.isLeft(decoded)) {
      const issues = ArrayFormatter.formatErrorSync(decoded.left)
      for (const issue of issues) {
        const field = issue.path.join('.')
        if (field === 'title') {
          fieldErrors['newSubject.title'] =
            'Le titre du sujet doit faire entre 3 et 100 caractères.'
        } else if (field === 'presentation') {
          fieldErrors['newSubject.presentation'] =
            'La présentation du sujet doit faire au moins 10 caractères.'
        } else if (field === 'problem') {
          fieldErrors['newSubject.problem'] =
            'La problématique du sujet doit faire au moins 10 caractères.'
        }
      }
    }
  }

  if (newPosition) {
    const decoded = S.decodeUnknownEither(NewPositionInput, { errors: 'all' })({
      title: newPosition.title,
      description: newPosition.description,
    })
    if (Either.isLeft(decoded)) {
      const issues = ArrayFormatter.formatErrorSync(decoded.left)
      for (const issue of issues) {
        const field = issue.path.join('.')
        if (field === 'title') {
          fieldErrors['newPosition.title'] =
            'Le titre de la position doit faire entre 3 et 255 caractères.'
        } else if (field === 'description') {
          fieldErrors['newPosition.description'] =
            'La description de la position doit faire au moins 10 caractères.'
        }
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return Either.left(fieldErrors)
  }

  // 5. Validate fact date not in future
  const parsedFactDate = parseISO(factDate)
  if (isFuture(parsedFactDate)) {
    return Either.left({ factDate: 'La date du fait ne peut pas être dans le futur.' })
  }

  // 6. Resolve public figure
  let resolvedFigureId: string
  let resolvedFigureSlug: string | undefined
  if (newPublicFigure) {
    const wikiResult = await wikipediaValidator.validatePage(newPublicFigure.wikipediaUrl)
    if (!wikiResult.exists) {
      return Either.left({
        'newPublicFigure.wikipediaUrl': 'La page Wikipedia n\u2019existe pas.',
      })
    }
    if (!wikiResult.isBiography) {
      return Either.left({
        'newPublicFigure.wikipediaUrl': 'La page Wikipedia ne correspond pas à une biographie.',
      })
    }

    const existingByUrl = await Effect.runPromise(
      publicFigureRepo.findByWikipediaUrl(newPublicFigure.wikipediaUrl),
    )
    if (existingByUrl) {
      return Either.left({
        'newPublicFigure.wikipediaUrl': `Cette URL Wikipedia est déjà utilisée par « ${existingByUrl.name} ».`,
      })
    }

    const figure = createPublicFigure({
      name: newPublicFigure.name,
      presentation: newPublicFigure.presentation,
      wikipediaUrl: newPublicFigure.wikipediaUrl,
      websiteUrl: newPublicFigure.websiteUrl || undefined,
      createdBy: contributor.id,
    })

    const created = await Effect.runPromise(publicFigureRepo.create(figure))
    resolvedFigureId = created.id
    resolvedFigureSlug = created.slug
  } else if (publicFigureId) {
    const figure = await Effect.runPromise(publicFigureRepo.findById(publicFigureId))
    if (!figure) {
      return Either.left('La personnalité sélectionnée est introuvable.')
    }
    resolvedFigureId = figure.id
  } else {
    return Either.left('Veuillez sélectionner ou créer une personnalité.')
  }

  // 7. Resolve subject
  let resolvedSubjectId: string
  let resolvedSubjectSlug: string
  if (newSubject) {
    const subject = createSubject({
      title: newSubject.title,
      presentation: newSubject.presentation,
      problem: newSubject.problem,
      createdBy: contributor.id,
    })

    const created = await Effect.runPromise(subjectRepo.create(subject))
    resolvedSubjectId = created.id
    resolvedSubjectSlug = created.slug
  } else if (subjectId) {
    const subject = await Effect.runPromise(subjectRepo.findById(subjectId))
    if (!subject) {
      return Either.left('Le sujet sélectionné est introuvable.')
    }
    resolvedSubjectId = subject.id
    resolvedSubjectSlug = subject.slug
  } else {
    return Either.left('Veuillez sélectionner ou créer un sujet.')
  }

  // 8. Resolve position
  let resolvedPositionId: string
  if (newPosition) {
    const position = createPosition({
      title: newPosition.title,
      description: newPosition.description,
      subjectId: resolvedSubjectId,
      createdBy: contributor.id,
    })

    const created = await Effect.runPromise(positionRepo.create(position))
    resolvedPositionId = created.id
  } else if (positionId) {
    const position = await Effect.runPromise(positionRepo.findById(positionId))
    if (!position) {
      return Either.left('La position sélectionnée est introuvable.')
    }
    if (position.subjectId !== resolvedSubjectId) {
      return Either.left("La position sélectionnée n'appartient pas à ce sujet.")
    }
    resolvedPositionId = position.id
  } else {
    return Either.left('Veuillez sélectionner ou créer une position.')
  }

  // 9. Create statement + evidence
  const statement = createStatement({
    publicFigureId: resolvedFigureId,
    positionId: resolvedPositionId,
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

  // 10. Award reputation
  if (newPublicFigure) {
    await Effect.runPromise(
      reputationRepo.recordEvent({
        contributorId: contributor.id,
        action: 'added_personality_validated',
        amount: reputationReward('added_personality_validated'),
        relatedEntityType: 'public_figure',
        relatedEntityId: resolvedFigureId,
      }),
    )
  }

  if (newSubject) {
    await Effect.runPromise(
      reputationRepo.recordEvent({
        contributorId: contributor.id,
        action: 'added_subject',
        amount: reputationReward('added_subject'),
        relatedEntityType: 'subject',
        relatedEntityId: resolvedSubjectId,
      }),
    )
  }

  if (newPosition) {
    await Effect.runPromise(
      reputationRepo.recordEvent({
        contributorId: contributor.id,
        action: 'added_position_validated',
        amount: reputationReward('added_position_validated'),
        relatedEntityType: 'position',
        relatedEntityId: resolvedPositionId,
      }),
    )
  }

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'added_statement_validated',
      amount: reputationReward('added_statement_validated'),
      relatedEntityType: 'statement',
      relatedEntityId: statement.id,
    }),
  )

  return Either.right({
    subjectSlug: resolvedSubjectSlug,
    publicFigureSlug: resolvedFigureSlug,
  })
}
