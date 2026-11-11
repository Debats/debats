import Link from 'next/link'
import { organisationHref } from '../../../domain/read-models/hrefs'
import styles from './OrganisationTag.module.css'

interface OrganisationTagProps {
  slug: string
  /** Nom court : le sigle quand il existe */
  label: string
  /** Rôle de la personnalité dans l'organisation, affiché après le nom */
  role?: string | null
}

/** Pastille violette qui relie une personnalité à une organisation. */
export default function OrganisationTag({ slug, label, role }: OrganisationTagProps) {
  return (
    <Link href={organisationHref(slug)} className={styles.tag}>
      {label}
      {role && <span className={styles.role}>{role}</span>}
    </Link>
  )
}
