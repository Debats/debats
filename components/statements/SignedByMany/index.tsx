import { JointDeclarationRef } from '../../../domain/entities/joint-declaration'
import { StatementAuthorRef } from '../../../domain/read-models/statement-author'
import { provenanceOfText } from '../../../domain/read-models/statement-provenance'
import { formatShortDate } from '../../../lib/format-date'
import AuthorAvatarStack from '../AuthorAvatarStack'
import ProvenanceLine from '../ProvenanceLine'
import SignedTogether from '../SignedTogether'
import styles from './SignedByMany.module.css'

interface SignedByManyProps {
  declaration: JointDeclarationRef
  /** La source et le jour du texte, qui sont ceux de chaque signature */
  source: { name: string; url: string; statedAt: Date }
  /** Les signataires nommé·es, puis combien d'autres ont signé */
  named: StatementAuthorRef[]
  others: number
}

/**
 * Les signatures d'une déclaration commune dans une liste datée, en une seule
 * entrée : qui a signé, combien d'autres avec, et la source du texte. Tous
 * les signataires se lisent sur la page du texte.
 */
export default function SignedByMany({ declaration, source, named, others }: SignedByManyProps) {
  return (
    <article className={styles.entry}>
      <AuthorAvatarStack authors={named} max={named.length} size={44} />
      <div className={styles.body}>
        <p className={styles.signed}>
          <SignedTogether
            declaration={declaration}
            named={named}
            others={others}
            nameClassName={styles.name}
            titleClassName={styles.declaration}
          />
        </p>
        <ProvenanceLine
          provenance={provenanceOfText(source)}
          notes={[
            <span key="day" className={styles.date}>
              {formatShortDate(source.statedAt)}
            </span>,
          ]}
        />
      </div>
    </article>
  )
}
