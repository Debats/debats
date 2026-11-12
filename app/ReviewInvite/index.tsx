import ReviewScope from '../../components/review/ReviewScope'
import DatedStatement from '../../components/statements/DatedStatement'
import Button from '../../components/ui/Button'
import { anotherToReviewHref, REVIEW_ANCHOR } from '../../domain/read-models/home-page'
import { subjectHref } from '../../domain/read-models/hrefs'
import { Viewer } from '../../domain/read-models/review'
import { authorOnSubjectHref } from '../../domain/read-models/statement-author'
import { StatementWithAuthorAndSubject } from '../../domain/repositories/statement-repository'
import styles from './ReviewInvite.module.css'

interface ReviewInviteProps {
  /** Une prise de position que personne n'a encore confirmée ni signalée */
  toReview: StatementWithAuthorAndSubject
  viewer: Viewer
  /** Combien de prises de position la personne a déjà passées : « une autre » demande la suivante */
  skip: number
}

/**
 * Deux minutes devant vous ? Une prise de position que personne n'a relue,
 * avec sa source à ouvrir et la marque de vérification où le dire : la
 * contribution la plus accessible du site, proposée dès l'accueil.
 *
 * La prise de position n'a par construction ni confirmation ni signalement :
 * le bloc n'a aucune marque à lire, il ouvre un périmètre de relecture vide.
 */
export default function ReviewInvite({ toReview, viewer, skip }: ReviewInviteProps) {
  const { statement, author, position, subject, arguments: used } = toReview

  return (
    <section className={styles.invite} id={REVIEW_ANCHOR}>
      <div className={styles.pitch}>
        <p className={styles.kicker}>Deux minutes devant vous ?</p>
        <h2 className={styles.title}>Vérifiez une source</h2>
        <p className={styles.text}>
          Ouvrez la source et lisez. Si la prise de position y figure bien, confirmez-la d’un clic
          sur la coche, au bout de la ligne de source ; sinon, signalez ce qui cloche. C’est la
          première contribution, ouverte à tout compte.
        </p>
        <div className={styles.actions}>
          <Button href={statement.sourceUrl} target="_blank" rel="noopener noreferrer">
            Ouvrir la source
          </Button>
          <Button href={anotherToReviewHref(skip)} variant="secondary">
            Une autre
          </Button>
        </div>
      </div>
      <div className={styles.statement}>
        <ReviewScope marks={{}} viewer={viewer}>
          <DatedStatement
            author={author}
            position={{
              title: position.title,
              href: authorOnSubjectHref(author, subject.slug),
            }}
            subject={{ title: subject.title, href: subjectHref(subject.slug) }}
            statement={statement}
            arguments={used}
          />
        </ReviewScope>
      </div>
    </section>
  )
}
