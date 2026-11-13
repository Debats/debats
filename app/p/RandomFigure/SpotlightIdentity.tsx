import Link from 'next/link'
import FigureAvatar from '../../../components/figures/FigureAvatar'
import OccupationTag from '../../../components/figures/OccupationTag'
import OrganisationTag from '../../../components/organisations/OrganisationTag'
import { FigureSpotlight } from '../../../domain/read-models/figure-spotlight'
import { figureHref, occupationFamilyHref } from '../../../domain/read-models/hrefs'
import { plural } from '../../../lib/plural'
import styles from './RandomFigure.module.css'

/** Qui elle est : son visage, son nom, ce que le site sait d'elle, ses métiers et ses organisations. */
export default function SpotlightIdentity({ spotlight }: { spotlight: FigureSpotlight }) {
  const { slug, name, statementsCount, subjectsCount, occupations, organisations } = spotlight

  return (
    <>
      <div className={styles.identity}>
        <span className={styles.avatar}>
          {/* La clé force un nouvel avatar : celui d'avant a pu échouer à charger */}
          <FigureAvatar key={slug} slug={slug} name={name} size={88} />
        </span>
        <div className={styles.naming}>
          <Link href={figureHref(slug)} className={styles.name}>
            {name}
          </Link>
          <p className={styles.counts}>
            {statementsCount} {plural(statementsCount, 'prise de position', 'prises de position')}
            {' · '}
            {subjectsCount} {plural(subjectsCount, 'sujet', 'sujets')}
          </p>
        </div>
      </div>

      {(occupations.length > 0 || organisations.length > 0) && (
        <div className={styles.tags}>
          {occupations.map((occupation) => (
            <OccupationTag
              key={occupation.name}
              name={occupation.name}
              href={occupationFamilyHref({ slug: occupation.familySlug })}
              current={occupation.isCurrent}
            />
          ))}
          {organisations.map((organisation) => (
            <OrganisationTag
              key={organisation.slug}
              slug={organisation.slug}
              label={organisation.label}
            />
          ))}
        </div>
      )}
    </>
  )
}
