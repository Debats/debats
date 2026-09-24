import { OG_COLORS, OG_FONTS } from '../../lib/og'

interface OgFrameProps {
  /** Petit libellé en capitales au-dessus du contenu (« Sujet », « Personnalité ») */
  kicker: string
  /** Symbole de la marque en data URI */
  brandMark: string
  /** Texte en bas à gauche, à côté de la marque */
  footer?: string
  children: React.ReactNode
}

/**
 * Cadre commun des images OpenGraph : papier, libellé, contenu, marque.
 * Styles en ligne uniquement : le moteur de rendu ne lit pas le CSS.
 */
export default function OgFrame({ kicker, brandMark, footer, children }: OgFrameProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px 64px 48px',
        backgroundColor: OG_COLORS.paper,
        fontFamily: OG_FONTS.sans,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span
          style={{
            fontFamily: OG_FONTS.sans,
            fontWeight: 600,
            fontSize: '22px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: OG_COLORS.ink3,
            marginBottom: '20px',
          }}
        >
          {kicker}
        </span>
        {children}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: `2px solid ${OG_COLORS.line}`,
        }}
      >
        <span style={{ fontSize: '24px', color: OG_COLORS.ink3 }}>{footer ?? ''}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- le moteur OpenGraph ne connaît pas next/image */}
          <img src={brandMark} alt="" height={44} />
          <span style={{ fontFamily: OG_FONTS.serif, fontSize: '40px', color: OG_COLORS.ink }}>
            Débats
          </span>
        </div>
      </div>
    </div>
  )
}
