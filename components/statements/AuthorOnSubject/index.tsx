import ContentWithSidebar from '../../layout/ContentWithSidebar'
import AlignmentCard from './AlignmentCard'
import AuthorRailCard from './AuthorRailCard'
import ContributeCard from './ContributeCard'
import DebateSection from './DebateSection'
import NeighbourSubjects from './NeighbourSubjects'
import PositionCard from './PositionCard'
import SubjectRailCard from './SubjectRailCard'
import Synthesis from './Synthesis'
import { StatementAuthorRef } from '../../../domain/read-models/statement-author'
import { AuthorSubjectPage } from '../../../domain/read-models/author-subject-page'
import {
  countSubjectVoices,
  PositionGroup,
  PositionStanding,
  SubjectCompany,
} from '../../../domain/services/author-on-subject'
import { plural } from '../../../lib/plural'
import styles from './AuthorOnSubject.module.css'

interface AuthorOnSubjectProps {
  author: StatementAuthorRef
  subject: { title: string; slug: string; problem: string }
  /** Les positions de l'auteur sur le sujet, avec ses prises de position */
  positions: PositionGroup[]
  company: SubjectCompany
  /** Le débat autour, les groupes, les sujets voisins, sa carte de visite */
  page: AuthorSubjectPage
  /** Toutes les positions du sujet, de la plus à la moins soutenue */
  debate: PositionStanding[]
  /** Lien de modification d'une prise de position, quand l'utilisateur y a droit */
  editHref?: (statementId: string) => string
}

/**
 * Le corps de la page « un auteur sur un sujet ».
 *
 * C'est la page la mieux référencée du site : un visiteur y arrive d'un
 * moteur de recherche sans connaître ni l'auteur ni le sujet. Elle lui
 * donne donc, dans l'ordre : la réponse en prose, la prise de position
 * sourcée, la place de cette position dans le débat, le débat entier, les
 * sujets voisins, et de quoi contribuer.
 */
export default function AuthorOnSubject({
  author,
  subject,
  positions,
  company,
  page,
  debate,
  editHref,
}: AuthorOnSubjectProps) {
  const statementsCount = positions.reduce((sum, group) => sum + group.statements.length, 0)
  const who = author.kind === 'organisation' ? 'cette organisation' : 'cette personnalité'
  const latest = positions
    .flatMap(({ statements }) => statements.map(({ statement }) => statement.statedAt))
    .reduce<Date | null>((last, date) => (!last || date > last ? date : last), null)
  const voices = countSubjectVoices(page.everyone)

  return (
    <ContentWithSidebar
      topMargin
      hideLatestStatements
      aside={
        <>
          <SubjectRailCard
            subject={subject}
            facts={{ positions: page.positions.length, voices, span: page.span }}
          />
          <AuthorRailCard author={author} profile={page.profile} />
        </>
      }
    >
      <Synthesis
        authorName={author.name}
        subjectTitle={subject.title}
        statements={statementsCount}
        positionTitles={positions.map(({ position }) => position.title)}
        allies={page.alignment.everyone.withAuthor}
        undefended={debate.filter((standing) => standing.authors.length === 0).length}
        latest={latest}
      />

      <section>
        <header className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            {statementsCount} {plural(statementsCount, 'prise de position', 'prises de position')}
          </h2>
        </header>

        {positions.length === 0 ? (
          <p className={styles.empty}>Aucune prise de position enregistrée pour l’instant.</p>
        ) : (
          <div className={styles.list}>
            {positions.map((group) => (
              <PositionCard
                key={group.position.id}
                subjectSlug={subject.slug}
                group={group}
                allies={company.alliesByPosition.get(group.position.id) ?? []}
                roles={page.roles}
                editHref={editHref}
              />
            ))}
          </div>
        )}
      </section>

      {positions.length > 0 && (
        <div className={styles.analysis}>
          <AlignmentCard debate={debate} alignment={page.alignment} voices={voices} who={who} />
        </div>
      )}

      <DebateSection subjectSlug={subject.slug} debate={debate} />

      <NeighbourSubjects author={author} neighbours={page.neighbours} />

      <ContributeCard authorName={author.name} statements={statementsCount} />
    </ContentWithSidebar>
  )
}
