import { Debate } from '../../domain/read-models/home-debates'
import { Glimpse } from '../../domain/read-models/home-page'
import { SUBJECTS_HREF } from '../../domain/read-models/hrefs'
import Shelf from '../Shelf'
import SubjectShelfCard from './SubjectShelfCard'

/** Le rayon des sujets, sur l'accueil : ceux où le plus de voix se sont exprimées ces trente derniers jours. */
export default function SubjectShelf({ subjects }: { subjects: Glimpse<Debate> }) {
  return (
    <Shelf
      title="Sujets"
      total={subjects.total}
      more={{ href: SUBJECTS_HREF, label: 'Tous les sujets' }}
      columnMin={280}
    >
      {subjects.shown.map((subject) => (
        <SubjectShelfCard key={subject.id} subject={subject} />
      ))}
    </Shelf>
  )
}
