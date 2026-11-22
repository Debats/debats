import { DraftJointDeclaration } from '../../../../domain/entities/draft-statement'
import styles from './DraftSignature.module.css'

interface DraftSignatureProps {
  declaration: DraftJointDeclaration
  authorName: string
}

/**
 * Ce que valider un brouillon de signature entraîne, dit avant de valider :
 * le brouillon ne montre qu'un sujet, la signature en engage autant que le
 * texte en compte.
 */
export default function DraftSignature({ declaration, authorName }: DraftSignatureProps) {
  return (
    <div className={styles.signature}>
      <p className={styles.heading}>Signature d’une déclaration commune</p>
      <p className={styles.title}>{declaration.title}</p>
      {declaration.presentation && <p className={styles.text}>{declaration.presentation}</p>}
      <p className={styles.text}>
        Valider ajoute {authorName} aux signataires du texte, et sa prise de position sur{' '}
        <strong>chacune</strong> des positions qu’il prend. Si le site ne connaît pas ce texte, il
        est référencé avec la source et la date de ce brouillon ; s’il était muet sur ce sujet,
        cette position lui est ajoutée, pour tou·tes ses signataires.
      </p>
    </div>
  )
}
