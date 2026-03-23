import { ResolvedEntity } from '../../../../domain/use-cases/resolve-draft'
import styles from './EntityStatus.module.css'

interface EntityStatusProps {
  label: string
  resolution: ResolvedEntity<{ slug?: string; name?: string; title?: string }>
  linkPrefix?: string
}

export default function EntityStatus({ label, resolution, linkPrefix }: EntityStatusProps) {
  if (resolution.found) {
    const entity = resolution.entity
    const display = entity.name ?? entity.title ?? ''
    const slug = entity.slug
    return (
      <span className={styles.found}>
        {'✓ '}
        {linkPrefix && slug ? <a href={`${linkPrefix}${slug}`}>{display}</a> : display}
      </span>
    )
  }
  if (resolution.canCreate) {
    return <span className={styles.create}>{`+ ${label} (sera créé)`}</span>
  }
  return <span className={styles.missing}>{`⚠ Données manquantes pour ${label}`}</span>
}
