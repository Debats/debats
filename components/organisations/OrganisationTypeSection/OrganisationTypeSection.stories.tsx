import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  ORGANISATIONS_PER_GROUP,
  OrganisationSummary,
  groupOrganisationsByType,
} from '../../../domain/read-models/organisation-summary'
import { OrganisationType } from '../../../domain/entities/organisation'
import OrganisationTypeSection from './index'

/** Une organisation de démonstration, avec les compteurs qui décident de son rang. */
const organisation = (
  name: string,
  statementsCount: number,
  membersCount: number,
  organisationType: OrganisationType = 'political_party',
): OrganisationSummary => ({
  id: name,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  acronym: null,
  organisationType,
  presentation: `${name} prend position dans le débat public français.`,
  membersCount,
  statementsCount,
  subjectsCount: statementsCount,
})

/** Les ordres de grandeur réels des partis en production : quelques gros, une longue traîne. */
const parties: OrganisationSummary[] = [
  organisation('Les Républicains', 12, 55),
  organisation('Parti socialiste', 9, 30),
  organisation('Les Écologistes', 14, 23),
  organisation('La France insoumise', 7, 13),
  organisation('Renaissance', 6, 13),
  organisation('Rassemblement national', 4, 11),
  organisation('Horizons', 3, 11),
  organisation('Parti communiste français', 2, 3),
  organisation('Debout la France', 1, 1),
  organisation('Nouveau Parti anticapitaliste', 0, 1),
  organisation('Cap Écologie', 0, 1),
  organisation('Alliance centriste', 0, 0),
]

const ngos: OrganisationSummary[] = [
  organisation('Greenpeace France', 5, 2, 'ngo'),
  organisation('Oxfam France', 3, 1, 'ngo'),
  organisation('Médecins du monde', 2, 1, 'ngo'),
]

const groupOf = (organisations: OrganisationSummary[], shown = ORGANISATIONS_PER_GROUP) =>
  groupOrganisationsByType(organisations, shown)[0]

const meta = {
  title: 'Organisations/OrganisationTypeSection',
  component: OrganisationTypeSection,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720, padding: 24, backgroundColor: 'var(--paper)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OrganisationTypeSection>

export default meta
type Story = StoryObj<typeof meta>

/** Douze partis pour une limite de huit : le lien annonce le groupe entier. */
export const Truncated: Story = {
  args: { group: groupOf(parties) },
}

/** Trois ONG : rien n'est caché, donc pas de lien — et le sigle garde ses capitales. */
export const Complete: Story = {
  args: { group: groupOf(ngos) },
}

/** Un seul parti au-delà de la limite : le lien apparaît dès la première carte cachée. */
export const OneHidden: Story = {
  args: { group: groupOf(parties.slice(0, ORGANISATIONS_PER_GROUP + 1)) },
}
