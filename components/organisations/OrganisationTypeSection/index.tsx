import {
  OrganisationTypeGroup,
  isTruncated,
} from '../../../domain/read-models/organisation-summary'
import ActionLink from '../../ui/ActionLink'
import OrganisationGrid from '../OrganisationGrid'
import styles from './OrganisationTypeSection.module.css'

interface OrganisationTypeSectionProps {
  group: OrganisationTypeGroup
}

/**
 * Une section de l'index des organisations : un type, ses organisations les plus engagées,
 * et le lien vers tout le groupe quand il en compte plus que ce qui est montré.
 */
export default function OrganisationTypeSection({ group }: OrganisationTypeSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>{group.label}</h2>
        {isTruncated(group) && (
          <ActionLink href={group.href}>
            Voir les {group.total} {group.inSentence}
          </ActionLink>
        )}
      </div>
      <OrganisationGrid organisations={group.organisations} />
    </section>
  )
}
