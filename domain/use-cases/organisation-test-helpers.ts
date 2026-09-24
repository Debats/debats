import { Effect } from 'effect'
import { createOrganisation, Organisation } from '../entities/organisation'
import { OrganisationMembership } from '../entities/organisation-membership'
import { OrganisationRepository } from '../repositories/organisation-repository'
import {
  MembershipWithFigure,
  MembershipWithOrganisation,
  OrganisationMembershipRepository,
} from '../repositories/organisation-membership-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { createPublicFigure, PublicFigure } from '../entities/public-figure'

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
  const rows = [...seed]
  return {
    findAll: () => Effect.succeed(rows),
    findBySlug: (slug) => Effect.succeed(rows.find((o) => o.slug === slug) ?? null),
    findById: (id) => Effect.succeed(rows.find((o) => o.id === id) ?? null),
    create: (organisation) => {
      rows.push(organisation)
      return Effect.succeed(organisation)
    },
    update: (organisation) => {
      const index = rows.findIndex((o) => o.id === organisation.id)
      rows[index] = organisation
      return Effect.succeed(organisation)
    },
    delete: () => Effect.succeed(undefined),
    findSummaries: () => Effect.succeed([]),
  }
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
    create: (membership) => {
      rows.push(membership)
      return Effect.succeed(membership)
    },
    delete: (id) => {
      const index = rows.findIndex((m) => m.id === id)
      if (index >= 0) rows.splice(index, 1)
      return Effect.succeed(undefined)
    },
  }
}

export function fakePublicFigureRepo(seed: PublicFigure[] = []): PublicFigureRepository {
  return {
    findAll: () => Effect.succeed(seed),
    findBySlug: (slug) => Effect.succeed(seed.find((f) => f.slug === slug) ?? null),
    findById: (id) => Effect.succeed(seed.find((f) => f.id === id) ?? null),
    findByWikipediaUrl: () => Effect.succeed(null),
    searchByName: () => Effect.succeed(seed),
    create: (f) => Effect.succeed(f),
    update: (f) => Effect.succeed(f),
    delete: () => Effect.succeed(undefined),
    getStats: () => Effect.succeed({ publicFigureId: '', subjectsCount: 0, statementsCount: 0 }),
    findSummariesByActivity: () => Effect.succeed([]),
    findByLetter: () => Effect.succeed([]),
  }
}

export function fakeReputationRepo(): ReputationRepository & {
  events: Array<{ action: string; contributorId: string }>
} {
  const events: Array<{ action: string; contributorId: string }> = []
  return {
    events,
    getReputation: () => Effect.succeed(0),
    recordEvent: (event) => {
      events.push({ action: event.action, contributorId: event.contributorId })
      return Effect.succeed(undefined)
    },
    getHistory: () => Effect.succeed([]),
  }
}

export const fakeWikipediaValidator = (result = { exists: true, isBiography: false }) => ({
  validatePage: async () => result,
})
