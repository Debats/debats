import Link from 'next/link'
import { Provenance } from '../../../domain/read-models/statement-provenance'
import styles from './ProvenanceLine.module.css'

interface ProvenanceTagProps {
  provenance: Provenance
}

/**
 * La pastille qui dit ce qu'est la prise de position, puis le nom de ce où
 * elle se lit, lié à la source, à une page du site, ou à rien quand la
 * source n'a pas d'adresse.
 */
export default function ProvenanceTag({ provenance }: ProvenanceTagProps) {
  const { label, name, link } = provenance
  return (
    <>
      <span className={styles.type}>{label}</span>
      {link?.kind === 'page' && (
        <Link href={link.href} className={styles.name}>
          {name}
        </Link>
      )}
      {link?.kind === 'source' && (
        <a href={link.url} target="_blank" rel="noopener noreferrer" className={styles.name}>
          {name}
        </a>
      )}
      {!link && <span className={styles.name}>{name}</span>}
    </>
  )
}
