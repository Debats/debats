import { Debate } from '../../domain/read-models/home-debates'
import { SUBJECTS_HREF } from '../../domain/read-models/hrefs'
import HomeSection from '../HomeSection'
import NewSubjectEntry from './NewSubjectEntry'
import styles from './NewSubjects.module.css'

interface NewSubjectsProps {
  subjects: Debate[]
  signedIn: boolean
}

/** Les sujets ouverts en dernier, dans le rail de l'accueil : ceux qui attendent le plus qu'on les complète. */
export default function NewSubjects({ subjects, signedIn }: NewSubjectsProps) {
  if (subjects.length === 0) return null

  return (
    <HomeSection title="Nouveaux sujets" more={{ href: SUBJECTS_HREF, label: 'Tous les sujets' }}>
      <ul className={styles.list}>
        {subjects.map((subject) => (
          <NewSubjectEntry key={subject.id} subject={subject} signedIn={signedIn} />
        ))}
      </ul>
    </HomeSection>
  )
}
