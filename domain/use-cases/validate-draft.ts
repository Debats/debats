import { Effect, Either } from 'effect'
import { DraftStatement } from '../entities/draft-statement'
import { generateSlug as generatePublicFigureSlug } from '../entities/public-figure'
import { generateOrganisationSlug } from '../entities/organisation'
import { generateSlug as generateSubjectSlug } from '../entities/subject'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { PositionRepository } from '../repositories/position-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { createPublicFigureUseCase } from './create-public-figure'
import { createOrganisationUseCase } from './create-organisation'
import { createSubjectUseCase } from './create-subject'
import { createPositionUseCase } from './create-position'
import { createStatementUseCase } from './create-statement'
import { organisationAuthor, publicFigureAuthor, StatementAuthor } from '../entities/statement'
import { ContributorIdentity, FieldErrors } from './types'

type ValidateDraftParams = {
  draftId: string
  contributor: ContributorIdentity
  draftRepo: DraftStatementRepository
  publicFigureRepo: PublicFigureRepository
  organisationRepo: OrganisationRepository
  subjectRepo: SubjectRepository
  positionRepo: PositionRepository
  statementRepo: StatementRepository
  reputationRepo: ReputationRepository
  wikipediaValidator: WikipediaValidator
}

function formatUseCaseError(error: string | FieldErrors): string {
  if (typeof error === 'string') return error
  return Object.values(error).join(' ')
}

export async function validateDraft(
  params: ValidateDraftParams,
): Promise<Either.Either<void, string>> {
  const {
    draftId,
    contributor,
    draftRepo,
    publicFigureRepo,
    organisationRepo,
    subjectRepo,
    positionRepo,
    statementRepo,
    reputationRepo,
    wikipediaValidator,
  } = params

  const draftResult = await Effect.runPromise(Effect.either(draftRepo.findById(draftId)))
  if (draftResult._tag === 'Left') return Either.left('Erreur lors de la lecture du brouillon.')
  if (!draftResult.right) return Either.left('Brouillon introuvable.')
  const draft = draftResult.right

  const author = await resolveOrCreateAuthor(draft, {
    contributor,
    publicFigureRepo,
    organisationRepo,
    reputationRepo,
    wikipediaValidator,
  })
  if (Either.isLeft(author)) return author

  const subjectId = await resolveOrCreateSubject(draft, {
    contributor,
    subjectRepo,
    reputationRepo,
  })
  if (Either.isLeft(subjectId)) return subjectId

  const positionId = await resolveOrCreatePosition(draft, subjectId.right, {
    contributor,
    positionRepo,
    subjectRepo,
    reputationRepo,
  })
  if (Either.isLeft(positionId)) return positionId

  const statementResult = await createStatementUseCase({
    contributor,
    subjectId: subjectId.right,
    author: author.right,
    positionId: positionId.right,
    statementType: draft.statementType,
    sourceName: draft.sourceName,
    sourceUrl: draft.sourceUrl,
    quote: draft.quote,
    statedAt: draft.date,
    statementRepo,
    positionRepo,
    publicFigureRepo,
    organisationRepo,
    reputationRepo,
  })
  if (Either.isLeft(statementResult)) {
    return Either.left(formatUseCaseError(statementResult.left))
  }

  const updateResult = await Effect.runPromise(
    Effect.either(draftRepo.updateStatus(draftId, 'validated')),
  )
  if (updateResult._tag === 'Left') {
    return Either.left('Erreur lors de la mise à jour du brouillon.')
  }

  return Either.right(undefined)
}

function resolveOrCreateAuthor(
  draft: DraftStatement,
  deps: {
    contributor: ContributorIdentity
    publicFigureRepo: PublicFigureRepository
    organisationRepo: OrganisationRepository
    reputationRepo: ReputationRepository
    wikipediaValidator: WikipediaValidator
  },
): Promise<Either.Either<StatementAuthor, string>> {
  return draft.author.kind === 'public_figure'
    ? resolveOrCreatePublicFigure(draft.author, deps)
    : resolveOrCreateOrganisation(draft.author, deps)
}

async function resolveOrCreatePublicFigure(
  author: Extract<DraftStatement['author'], { kind: 'public_figure' }>,
  deps: {
    contributor: ContributorIdentity
    publicFigureRepo: PublicFigureRepository
    reputationRepo: ReputationRepository
    wikipediaValidator: WikipediaValidator
  },
): Promise<Either.Either<StatementAuthor, string>> {
  const lookup = await Effect.runPromise(
    Effect.either(deps.publicFigureRepo.findBySlug(generatePublicFigureSlug(author.name))),
  )
  if (lookup._tag === 'Left') return Either.left('Erreur lors de la recherche de la personnalité.')
  if (lookup.right) return Either.right(publicFigureAuthor(lookup.right.id))

  if (!author.data) {
    return Either.left(`Données manquantes pour créer la personnalité « ${author.name} ».`)
  }

  const result = await createPublicFigureUseCase({
    contributor: deps.contributor,
    name: author.name,
    presentation: author.data.presentation,
    wikipediaUrl: author.data.wikipediaUrl ?? '',
    websiteUrl: author.data.websiteUrl ?? '',
    notorietySources: author.data.notorietySources ?? [],
    publicFigureRepo: deps.publicFigureRepo,
    reputationRepo: deps.reputationRepo,
    wikipediaValidator: deps.wikipediaValidator,
  })
  if (Either.isLeft(result)) return Either.left(formatUseCaseError(result.left))
  return Either.right(publicFigureAuthor(result.right.id))
}

async function resolveOrCreateOrganisation(
  author: Extract<DraftStatement['author'], { kind: 'organisation' }>,
  deps: {
    contributor: ContributorIdentity
    organisationRepo: OrganisationRepository
    reputationRepo: ReputationRepository
    wikipediaValidator: WikipediaValidator
  },
): Promise<Either.Either<StatementAuthor, string>> {
  const lookup = await Effect.runPromise(
    Effect.either(deps.organisationRepo.findBySlug(generateOrganisationSlug(author.name))),
  )
  if (lookup._tag === 'Left') return Either.left("Erreur lors de la recherche de l'organisation.")
  if (lookup.right) return Either.right(organisationAuthor(lookup.right.id))

  if (!author.data) {
    return Either.left(`Données manquantes pour créer l'organisation « ${author.name} ».`)
  }

  const result = await createOrganisationUseCase({
    contributor: deps.contributor,
    name: author.name,
    acronym: author.data.acronym ?? '',
    organisationType: author.data.organisationType,
    presentation: author.data.presentation,
    wikipediaUrl: author.data.wikipediaUrl ?? '',
    websiteUrl: author.data.websiteUrl ?? '',
    notorietySources: author.data.notorietySources ?? [],
    organisationRepo: deps.organisationRepo,
    reputationRepo: deps.reputationRepo,
    wikipediaValidator: deps.wikipediaValidator,
  })
  if (Either.isLeft(result)) return Either.left(formatUseCaseError(result.left))
  return Either.right(organisationAuthor(result.right.id))
}

async function resolveOrCreateSubject(
  draft: DraftStatement,
  deps: {
    contributor: ContributorIdentity
    subjectRepo: SubjectRepository
    reputationRepo: ReputationRepository
  },
): Promise<Either.Either<string, string>> {
  const lookup = await Effect.runPromise(
    Effect.either(deps.subjectRepo.findBySlug(generateSubjectSlug(draft.subjectTitle))),
  )
  if (lookup._tag === 'Left') return Either.left('Erreur lors de la recherche du sujet.')
  if (lookup.right) return Either.right(lookup.right.id)

  if (!draft.subjectData) {
    return Either.left(`Données manquantes pour créer le sujet « ${draft.subjectTitle} ».`)
  }

  const result = await createSubjectUseCase({
    contributor: deps.contributor,
    title: draft.subjectTitle,
    presentation: draft.subjectData.presentation,
    problem: draft.subjectData.problem,
    subjectRepo: deps.subjectRepo,
    reputationRepo: deps.reputationRepo,
  })
  if (Either.isLeft(result)) return Either.left(formatUseCaseError(result.left))
  return Either.right(result.right.id)
}

async function resolveOrCreatePosition(
  draft: DraftStatement,
  subjectId: string,
  deps: {
    contributor: ContributorIdentity
    positionRepo: PositionRepository
    subjectRepo: SubjectRepository
    reputationRepo: ReputationRepository
  },
): Promise<Either.Either<string, string>> {
  const lookup = await Effect.runPromise(
    Effect.either(deps.positionRepo.findBySubjectId(subjectId)),
  )
  if (lookup._tag === 'Left') return Either.left('Erreur lors de la recherche des positions.')
  const positions = lookup.right
  const match = positions.find((p) => p.title === draft.positionTitle)
  if (match) return Either.right(match.id)

  if (!draft.positionData) {
    return Either.left(`Données manquantes pour créer la position « ${draft.positionTitle} ».`)
  }

  const result = await createPositionUseCase({
    contributor: deps.contributor,
    subjectId,
    title: draft.positionTitle,
    description: draft.positionData.description,
    positionRepo: deps.positionRepo,
    subjectRepo: deps.subjectRepo,
    reputationRepo: deps.reputationRepo,
  })
  if (Either.isLeft(result)) return Either.left(formatUseCaseError(result.left))
  return Either.right(result.right.id)
}
