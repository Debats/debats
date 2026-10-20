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
import { RunUnitOfWork } from '../events/unit-of-work'
import { SubjectSource } from './subject-stream'
import { PublicFigureSource } from './public-figure-stream'
import { ArgumentRepository } from '../repositories/argument-repository'
import { OccupationRepository } from '../repositories/occupation-repository'
import { OrganisationMembershipRepository } from '../repositories/organisation-membership-repository'
import { sameOccupationName } from '../entities/occupation'
import { isCurrentMembership } from '../entities/organisation-membership'
import { OccupationAssignmentInput } from '../read-models/occupations'
import { setPublicFigureOccupationsUseCase } from './set-public-figure-occupations'
import { addOrganisationMembershipUseCase } from './add-organisation-membership'
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
  runUnitOfWork: RunUnitOfWork
  subjectSource: SubjectSource
  publicFigureSource: PublicFigureSource
  argumentRepo: ArgumentRepository
  occupationRepo: OccupationRepository
  membershipRepo: OrganisationMembershipRepository
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
    runUnitOfWork,
    subjectSource,
    publicFigureSource,
    argumentRepo,
    occupationRepo,
    membershipRepo,
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
    runUnitOfWork,
    wikipediaValidator,
  })
  if (Either.isLeft(author)) return author

  // What the draft says of the person herself, applied before the statement so
  // that a wrong occupation or affiliation stops the draft instead of landing
  // a statement whose author stays half documented.
  if (author.right.kind === 'public_figure') {
    const occupations = await applyOccupations(draft, author.right.id, {
      contributor,
      occupationRepo,
      runUnitOfWork,
      publicFigureSource,
    })
    if (Either.isLeft(occupations)) return occupations

    const affiliations = await applyAffiliations(draft, author.right.id, {
      contributor,
      organisationRepo,
      membershipRepo,
      runUnitOfWork,
      publicFigureSource,
      wikipediaValidator,
    })
    if (Either.isLeft(affiliations)) return affiliations
  }

  const subjectId = await resolveOrCreateSubject(draft, {
    contributor,
    subjectRepo,
    runUnitOfWork,
  })
  if (Either.isLeft(subjectId)) return subjectId

  const positionId = await resolveOrCreatePosition(draft, subjectId.right, {
    contributor,
    positionRepo,
    runUnitOfWork,
    subjectSource,
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
    // Titles only: an existing argument is reused, a new one created.
    arguments: {
      argumentIds: [],
      newArguments: draft.arguments.map(({ title, description }) => ({
        title,
        description: description ?? '',
      })),
    },
    runUnitOfWork,
    positionRepo,
    publicFigureRepo,
    organisationRepo,
    argumentRepo,
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

/**
 * Assigns the occupations the draft names to the public figure, keeping those
 * she already holds: a draft documents one statement, it does not redefine a
 * career. Every name must designate a listed occupation.
 */
async function applyOccupations(
  draft: DraftStatement,
  publicFigureId: string,
  deps: {
    contributor: ContributorIdentity
    occupationRepo: OccupationRepository
    runUnitOfWork: RunUnitOfWork
    publicFigureSource: PublicFigureSource
  },
): Promise<Either.Either<void, string>> {
  if (draft.occupations.length === 0) return Either.right(undefined)

  const listed = await Effect.runPromise(Effect.either(deps.occupationRepo.findAll()))
  if (listed._tag === 'Left') return Either.left('Erreur lors de la lecture des métiers.')

  const drafted: OccupationAssignmentInput[] = []
  for (const occupation of draft.occupations) {
    const match = listed.right.find((candidate) =>
      sameOccupationName(occupation.name, candidate.name),
    )
    if (!match) {
      return Either.left(`Le métier « ${occupation.name} » n’est pas dans la liste.`)
    }
    drafted.push({ occupationId: match.id, current: occupation.current })
  }

  const held = await Effect.runPromise(
    Effect.either(deps.occupationRepo.findByPublicFigureId(publicFigureId)),
  )
  if (held._tag === 'Left') return Either.left('Erreur lors de la lecture des métiers.')

  return setPublicFigureOccupationsUseCase({
    contributor: deps.contributor,
    publicFigureId,
    assignments: [
      ...held.right.map(({ occupation, current }) => ({ occupationId: occupation.id, current })),
      ...drafted,
    ],
    occupationRepo: deps.occupationRepo,
    runUnitOfWork: deps.runUnitOfWork,
    publicFigureSource: deps.publicFigureSource,
  })
}

/**
 * Affiliates the public figure to the organisations the draft names, creating
 * those the catalogue lacks. An affiliation already running is left as it is:
 * restating a known fact changes nothing.
 */
async function applyAffiliations(
  draft: DraftStatement,
  publicFigureId: string,
  deps: {
    contributor: ContributorIdentity
    organisationRepo: OrganisationRepository
    membershipRepo: OrganisationMembershipRepository
    runUnitOfWork: RunUnitOfWork
    publicFigureSource: PublicFigureSource
    wikipediaValidator: WikipediaValidator
  },
): Promise<Either.Either<void, string>> {
  for (const affiliation of draft.affiliations) {
    const organisationId = await resolveOrCreateAffiliatedOrganisation(affiliation, deps)
    if (Either.isLeft(organisationId)) return organisationId

    const memberships = await Effect.runPromise(
      Effect.either(deps.membershipRepo.findByOrganisationId(organisationId.right)),
    )
    if (memberships._tag === 'Left') {
      return Either.left('Erreur lors de la lecture des affiliations.')
    }
    const alreadyRunning = memberships.right.some(
      ({ membership }) =>
        membership.publicFigureId === publicFigureId && isCurrentMembership(membership),
    )
    if (alreadyRunning) continue

    const added = await addOrganisationMembershipUseCase({
      contributor: deps.contributor,
      organisationId: organisationId.right,
      publicFigureId,
      role: affiliation.role ?? '',
      startedOn: affiliation.startedOn ?? '',
      endedOn: affiliation.endedOn ?? '',
      organisationRepo: deps.organisationRepo,
      runUnitOfWork: deps.runUnitOfWork,
      publicFigureSource: deps.publicFigureSource,
    })
    if (Either.isLeft(added)) {
      return Either.left(
        `Affiliation à « ${affiliation.organisation} » : ${formatUseCaseError(added.left)}`,
      )
    }
  }

  return Either.right(undefined)
}

async function resolveOrCreateAffiliatedOrganisation(
  affiliation: DraftStatement['affiliations'][number],
  deps: {
    contributor: ContributorIdentity
    organisationRepo: OrganisationRepository
    runUnitOfWork: RunUnitOfWork
    wikipediaValidator: WikipediaValidator
  },
): Promise<Either.Either<string, string>> {
  const lookup = await Effect.runPromise(
    Effect.either(
      deps.organisationRepo.findBySlug(generateOrganisationSlug(affiliation.organisation)),
    ),
  )
  if (lookup._tag === 'Left') return Either.left("Erreur lors de la recherche de l'organisation.")
  if (lookup.right) return Either.right(lookup.right.id)

  const data = affiliation.organisationData
  if (!data) {
    return Either.left(
      `Données manquantes pour créer l'organisation « ${affiliation.organisation} ».`,
    )
  }

  const result = await createOrganisationUseCase({
    contributor: deps.contributor,
    name: affiliation.organisation,
    acronym: data.acronym ?? '',
    organisationType: data.organisationType,
    presentation: data.presentation,
    wikipediaUrl: data.wikipediaUrl ?? '',
    websiteUrl: data.websiteUrl ?? '',
    notorietySources: data.notorietySources ?? [],
    runUnitOfWork: deps.runUnitOfWork,
    organisationRepo: deps.organisationRepo,
    wikipediaValidator: deps.wikipediaValidator,
  })
  if (Either.isLeft(result)) return Either.left(formatUseCaseError(result.left))
  return Either.right(result.right.id)
}

function resolveOrCreateAuthor(
  draft: DraftStatement,
  deps: {
    contributor: ContributorIdentity
    publicFigureRepo: PublicFigureRepository
    organisationRepo: OrganisationRepository
    runUnitOfWork: RunUnitOfWork
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
    runUnitOfWork: RunUnitOfWork
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
    runUnitOfWork: deps.runUnitOfWork,
    publicFigureRepo: deps.publicFigureRepo,
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
    runUnitOfWork: RunUnitOfWork
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
    runUnitOfWork: deps.runUnitOfWork,
    organisationRepo: deps.organisationRepo,
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
    runUnitOfWork: RunUnitOfWork
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
    runUnitOfWork: deps.runUnitOfWork,
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
    runUnitOfWork: RunUnitOfWork
    subjectSource: SubjectSource
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
    runUnitOfWork: deps.runUnitOfWork,
    subjectSource: deps.subjectSource,
  })
  if (Either.isLeft(result)) return Either.left(formatUseCaseError(result.left))
  return Either.right(result.right.id)
}
