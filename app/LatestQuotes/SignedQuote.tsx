import AuthorAvatarStack from '../../components/statements/AuthorAvatarStack'
import SignedTogether from '../../components/statements/SignedTogether'
import { JointDeclarationRef } from '../../domain/entities/joint-declaration'
import { StatementAuthorRef } from '../../domain/read-models/statement-author'
import { formatShortDate } from '../../lib/format-date'
import styles from './LatestQuotes.module.css'

interface SignedQuoteProps {
  declaration: JointDeclarationRef
  /** La source et le jour du texte, qui sont ceux de chaque signature */
  source: { name: string; statedAt: Date }
  named: StatementAuthorRef[]
  others: number
}

/**
 * Les signatures d'une déclaration commune dans le rail de l'accueil, en une
 * seule entrée. Les positions que le texte prend se lisent sur sa page.
 */
export default function SignedQuote({ declaration, source, named, others }: SignedQuoteProps) {
  return (
    <li className={styles.entry}>
      <p className={styles.meta}>
        {formatShortDate(source.statedAt)} · {source.name}
      </p>
      <div className={styles.who}>
        <AuthorAvatarStack authors={named} max={named.length} size={36} />
        <p className={styles.line}>
          <SignedTogether
            declaration={declaration}
            named={named}
            others={others}
            nameClassName={styles.name}
            titleClassName={styles.subject}
          />
        </p>
      </div>
    </li>
  )
}
