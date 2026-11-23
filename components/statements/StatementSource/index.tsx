import { ReactNode } from 'react'
import { JointDeclarationRef } from '../../../domain/entities/joint-declaration'
import { StatementContent, statementTypeOf } from '../../../domain/entities/statement'
import { provenanceOf } from '../../../domain/read-models/statement-provenance'
import { formatShortDate } from '../../../lib/format-date'
import EntityReview from '../../review/EntityReview'
import ProvenanceLine from '../ProvenanceLine'
import styles from './StatementSource.module.css'

interface StatementSourceProps {
  statement: {
    /** Nomme la prise de position pour sa marque de vérification, en fin de ligne */
    id: string
    /** Le type n'est pas une donnée à part : c'est la nature de ce qui est porté */
    content: StatementContent
    sourceName: string
    sourceUrl: string
    statedAt: Date
    /** La déclaration commune dont la prise de position est une signature, quand elle en est une */
    jointDeclaration?: JointDeclarationRef
  }
  /** Faux quand la page donne déjà le jour ailleurs sur la carte */
  dated?: boolean
  /** Compléments en fin de ligne : lien de modification, autres auteurs… */
  children?: ReactNode
}

/**
 * La ligne de provenance d'une prise de position : ce qu'elle est et où elle
 * se lit (`provenanceOf`), sa date, puis ce que les lecteur·rices en ont
 * vérifié, quand la page a lu les marques.
 */
export default function StatementSource({
  statement,
  dated = true,
  children,
}: StatementSourceProps) {
  const { id, content, sourceName, sourceUrl, statedAt, jointDeclaration } = statement
  const provenance = provenanceOf({
    statementType: statementTypeOf(content),
    sourceName,
    sourceUrl,
    jointDeclaration,
  })
  const day = (
    <span key="day" className={styles.date}>
      {formatShortDate(statedAt)}
    </span>
  )

  return (
    <ProvenanceLine provenance={provenance} notes={dated ? [day] : []}>
      {children}
      <EntityReview entity={{ type: 'statement', id }} />
    </ProvenanceLine>
  )
}
