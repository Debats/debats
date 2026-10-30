import { Effect, Option } from 'effect'
import { createOrganisation, createPublicFigure } from '../entities/entity-test-helpers'
import { Organisation } from '../entities/organisation'
import { organisationAdded, organisationStream } from '../aggregates/organisation'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { OrganisationMembership } from '../entities/organisation-membership'
import { OrganisationRepository } from '../repositories/organisation-repository'
import {
  MembershipWithFigure,
  MembershipWithOrganisation,
  OrganisationMembershipRepository,
} from '../repositories/organisation-membership-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { PublicFigure } from '../entities/public-figure'

export const sampleOrganisation = (): Organisation =>
  createOrganisation({
    name: 'Attac France',
    acronym: 'Attac',
    organisationType: 'association',
    presentation: 'Mouvement altermondialiste créé en 1998.',
    createdBy: 'founder',
  })

export const sampleFigure = (): PublicFigure =>
  createPublicFigure({
    name: 'Aurélie Trouvé',
    presentation: 'Économiste et femme politique française.',
    createdBy: 'founder',
  })

/** In-memory organisation repository seeded with the given organisations. */
export function fakeOrganisationRepo(seed: Organisation[] = []): OrganisationRepository {
  return {
    findAll: () => Effect.succeed(seed),
    findBySlug: (slug) => Effect.succeed(seed.find((o) => o.slug === slug) ?? null),
    findById: (id) => Effect.succeed(seed.find((o) => o.id === id) ?? null),
    searchByName: () => Effect.succeed(seed),
    findSummaries: () => Effect.succeed([]),
  }
}

/** An in-memory journal where these organisations already have their streams */
export async function journalWithOrganisations(...organisations: Organisation[]) {
  const unit = inMemoryUnitOfWork()
  for (const organisation of organisations) {
    await Effect.runPromise(
      unit.journal.append(
        organisationStream(organisation.id),
        0,
        [
          organisationAdded({
            name: organisation.name,
            acronym: Option.getOrUndefined(organisation.acronym),
            organisationType: organisation.organisationType,
            presentation: organisation.presentation,
            notorietySources: organisation.notorietySources,
          }),
        ],
        { actorId: organisation.createdBy },
      ),
    )
  }
  return unit
}

/** In-memory membership repository; joins are stubbed with the seeded entities. */
export function fakeMembershipRepo(
  seed: OrganisationMembership[] = [],
  figures: PublicFigure[] = [],
  organisations: Organisation[] = [],
): OrganisationMembershipRepository & { rows: OrganisationMembership[] } {
  const rows = [...seed]
  return {
    rows,
    findById: (id) => Effect.succeed(rows.find((m) => m.id === id) ?? null),
    findByOrganisationId: (organisationId) =>
      Effect.succeed(
        rows
          .filter((m) => m.organisationId === organisationId)
          .map((membership): MembershipWithFigure => {
            const figure = figures.find((f) => f.id === membership.publicFigureId)!
            return { membership, figure: { id: figure.id, name: figure.name, slug: figure.slug } }
          }),
      ),
    findByPublicFigureId: (publicFigureId) =>
      Effect.succeed(
        rows
          .filter((m) => m.publicFigureId === publicFigureId)
          .map((membership): MembershipWithOrganisation => {
            const organisation = organisations.find((o) => o.id === membership.organisationId)!
            return {
              membership,
              organisation: {
                id: organisation.id,
                name: organisation.name,
                slug: organisation.slug,
                acronym: null,
                organisationType: organisation.organisationType,
              },
            }
          }),
      ),
  }
}

export function fakePublicFigureRepo(seed: PublicFigure[] = []): PublicFigureRepository {
  return {
    findAll: () => Effect.succeed(seed),
    findBySlug: (slug) => Effect.succeed(seed.find((f) => f.slug === slug) ?? null),
    findById: (id) => Effect.succeed(seed.find((f) => f.id === id) ?? null),
    findByWikipediaUrl: () => Effect.succeed(null),
    searchByName: () => Effect.succeed(seed),
    getStats: () => Effect.succeed({ publicFigureId: '', subjectsCount: 0, statementsCount: 0 }),
    findSummariesByActivity: () => Effect.succeed([]),
    findByLetter: () => Effect.succeed([]),
    findSummariesByIds: () => Effect.succeed([]),
  }
}

export function fakeReputationRepo(): ReputationRepository {
  return {
    getReputation: () => Effect.succeed(0),
    getHistory: () => Effect.succeed([]),
  }
}

export const fakeWikipediaValidator = (result = { exists: true, isBiography: false }) => ({
  validatePage: async () => result,
})
