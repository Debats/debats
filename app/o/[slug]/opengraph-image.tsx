import { ImageResponse } from 'next/og'
import { Effect, Option } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createOrganisationRepository } from '../../../infra/database/organisation-repository-supabase'
import { createOrganisationMembershipRepository } from '../../../infra/database/organisation-membership-repository-supabase'
import { ORGANISATION_TYPE_LABELS } from '../../../domain/entities/organisation'
import { isCurrentMembership } from '../../../domain/entities/organisation-membership'
import {
  OG_COLORS,
  OG_FONTS,
  loadBrandMark,
  loadLogo,
  loadOgFonts,
  truncate,
} from '../../../lib/og'
import { plural } from '../../../lib/plural'
import OgFrame from '../../../components/og/OgFrame'

export const alt = 'Organisation'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const supabase = createAdminSupabaseClient()
  const organisation = await Effect.runPromise(
    createOrganisationRepository(supabase).findBySlug(slug),
  )

  if (!organisation) {
    return new ImageResponse(<div>Organisation introuvable</div>, { ...size })
  }

  const [memberships, fonts, brandMark, logoSrc] = await Promise.all([
    Effect.runPromise(
      createOrganisationMembershipRepository(supabase).findByOrganisationId(organisation.id),
    ),
    loadOgFonts(),
    loadBrandMark(),
    loadLogo(slug),
  ])
  const membersCount = memberships.filter(({ membership }) =>
    isCurrentMembership(membership),
  ).length
  const acronym = Option.getOrNull(organisation.acronym)

  return new ImageResponse(
    <OgFrame
      kicker={`Organisation · ${ORGANISATION_TYPE_LABELS[organisation.organisationType]}`}
      brandMark={brandMark}
      footer={`${membersCount} ${plural(membersCount, 'personnalité affiliée', 'personnalités affiliées')}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
        {logoSrc && (
          <img
            src={logoSrc}
            alt=""
            width={180}
            height={180}
            style={{
              objectFit: 'contain',
              borderRadius: '24px',
              backgroundColor: OG_COLORS.card,
              padding: '12px',
            }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <span
            style={{
              fontFamily: OG_FONTS.serif,
              fontSize: '72px',
              lineHeight: 1.05,
              color: OG_COLORS.ink,
            }}
          >
            {organisation.name}
          </span>
          {acronym && (
            <span style={{ fontSize: '28px', color: OG_COLORS.ink3, marginTop: '8px' }}>
              {acronym}
            </span>
          )}
          <span
            style={{ fontSize: '28px', lineHeight: 1.4, color: OG_COLORS.ink2, marginTop: '12px' }}
          >
            {truncate(organisation.presentation, 140)}
          </span>
        </div>
      </div>
    </OgFrame>,
    { ...size, fonts },
  )
}
