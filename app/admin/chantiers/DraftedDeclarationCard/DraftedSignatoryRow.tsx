import { DraftedSignatory } from '../../../../domain/read-models/joint-declaration-draft'
import AuthorCreationPreview from '../../drafts/AuthorCreationPreview'
import EntityStatus from '../../drafts/EntityStatus'
import styles from './DraftedDeclarationCard.module.css'

interface DraftedSignatoryRowProps {
  signatory: DraftedSignatory
}

/** Un·e signataire que les brouillons nomment : déjà sur le site, ou créé·e par la validation */
export default function DraftedSignatoryRow({ signatory }: DraftedSignatoryRowProps) {
  const { author, resolution } = signatory
  return (
    <li className={styles.signatory}>
      <EntityStatus
        label={author.name}
        resolution={resolution}
        linkPrefix={author.kind === 'organisation' ? '/o/' : '/p/'}
      />
      {!resolution.found && <AuthorCreationPreview author={author} />}
    </li>
  )
}
