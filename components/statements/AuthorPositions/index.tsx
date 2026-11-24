import AuthorPositionCard from './AuthorPositionCard'
import {
  countStatements,
  PositionGroup,
  SubjectCompany,
} from '../../../domain/services/author-on-subject'
import { plural } from '../../../lib/plural'
import styles from './AuthorPositions.module.css'

interface AuthorPositionsProps {
  subjectSlug: string
  /** Les positions de l'auteur sur le sujet, avec ses prises de position */
  positions: PositionGroup[]
  /** Celles qu'il tient aujourd'hui : les autres, il les a quittées */
  held: ReadonlySet<string>
  company: SubjectCompany
  /** Le métier actuel de chaque personnalité, pour la nommer sous son nom */
  roles: Map<string, string>
  /** Lien de modification d'une prise de position, quand l'utilisateur y a droit */
  editHref?: (statementId: string) => string
}

/**
 * Ce que l'auteur défend sur le sujet, sourcé et daté : la réponse que le
 * visiteur est venu chercher. Une carte par position, dans l'ordre où elle
 * apparaît dans son histoire.
 */
export default function AuthorPositions({
  subjectSlug,
  positions,
  held,
  company,
  roles,
  editHref,
}: AuthorPositionsProps) {
  // Compté sur la liste affichée, et non reçu de la page : le titre ne peut
  // pas annoncer un nombre que les cartes en dessous ne portent pas.
  const statements = countStatements(positions)

  return (
    <section className={styles.section}>
      <header className={styles.head}>
        <h2 className={styles.title}>
          {statements} {plural(statements, 'prise de position', 'prises de position')}
        </h2>
      </header>

      {positions.length === 0 ? (
        <p className={styles.empty}>Aucune prise de position enregistrée pour l’instant.</p>
      ) : (
        <div className={styles.list}>
          {positions.map((group) => (
            <AuthorPositionCard
              key={group.position.id}
              subjectSlug={subjectSlug}
              group={group}
              left={!held.has(group.position.id)}
              allies={company.alliesByPosition.get(group.position.id) ?? []}
              roles={roles}
              editHref={editHref}
            />
          ))}
        </div>
      )}
    </section>
  )
}
