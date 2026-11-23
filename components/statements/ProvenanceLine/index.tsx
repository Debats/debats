import { Fragment, ReactNode } from 'react'
import { Provenance } from '../../../domain/read-models/statement-provenance'
import ProvenanceTag from './ProvenanceTag'
import styles from './ProvenanceLine.module.css'

interface ProvenanceLineProps {
  provenance: Provenance
  /** Ce qui suit la provenance, chacun après un point médian : une date, un lien vers les autres… */
  notes?: ReactNode[]
  /** Ce qui ferme la ligne sans séparateur : lien de modification, marque de relecture */
  children?: ReactNode
}

/**
 * La ligne posée sous une prise de position : d'où elle vient, puis ce que
 * la page veut en dire de plus. Seule à connaître l'alignement de la ligne
 * et son séparateur.
 */
export default function ProvenanceLine({ provenance, notes = [], children }: ProvenanceLineProps) {
  return (
    <div className={styles.line}>
      <ProvenanceTag provenance={provenance} />
      {notes.map((note, index) => (
        <Fragment key={index}>
          <span className={styles.separator} aria-hidden="true">
            ·
          </span>
          {note}
        </Fragment>
      ))}
      {children}
    </div>
  )
}
